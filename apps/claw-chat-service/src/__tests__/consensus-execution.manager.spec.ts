import { AppConfig } from '../app/config/app.config';
import { ConsensusExecutionManager } from '../modules/chat-messages/managers/consensus-execution.manager';
import type { ParallelModelTarget } from '../modules/chat-messages/types/parallel.types';
import type { AssembledContext } from '../modules/chat-messages/types/context.types';

jest.spyOn(AppConfig, 'get').mockReturnValue({
  CHAT_DATABASE_URL: 'postgresql://test:test@localhost:5432/test',
  REDIS_URL: 'redis://localhost:6379',
  RABBITMQ_URL: 'amqp://localhost:5672',
  JWT_SECRET: 'a'.repeat(32),
  OLLAMA_SERVICE_URL: 'http://localhost:4008',
  CONNECTOR_SERVICE_URL: 'http://localhost:4003',
  MEMORY_SERVICE_URL: 'http://localhost:4005',
  FILE_SERVICE_URL: 'http://localhost:4006',
  IMAGE_SERVICE_URL: 'http://localhost:4012',
  FILE_GENERATION_SERVICE_URL: 'http://localhost:4013',
  OLLAMA_GENERATE_TIMEOUT_MS: 300_000,
  CHAT_PORT: 4002,
} as any);

describe('ConsensusExecutionManager', () => {
  let manager: ConsensusExecutionManager;

  const mockChatExecutionManager = {
    callProvider: jest.fn(),
  };

  const mockContextAssemblyManager = {
    assemble: jest.fn(),
  };

  const mockChatMessagesRepository = {
    create: jest.fn(),
    findRecentByThreadId: jest.fn(),
  };

  const mockChatThreadsRepository = {
    findById: jest.fn(),
  };

  const mockChatStreamService = {
    emitCompletion: jest.fn(),
    emitError: jest.fn(),
  };

  // Universal-research PR2: research-enricher dependency.
  const mockResearchEnricherManager = {
    enrichForOrchestration: jest.fn().mockResolvedValue({ transcript: null, systemPrompt: '' }),
  };

  const mockContext: AssembledContext = {
    userId: 'user-1',
    systemPrompt: null,
    threadMessages: [],
    memories: [],
    contextPackItems: [],
    fileContents: [],
    workspaceCitations: [],
    tokenBudget: 4096,
    researchEvidence: [],
    researchRunId: null,
    researchWarnings: [],
  };

  const sampleModels: ParallelModelTarget[] = [
    { provider: 'ANTHROPIC', model: 'claude-sonnet-4' },
    { provider: 'OPENAI', model: 'gpt-4o' },
  ];

  beforeEach(() => {
    jest.clearAllMocks();

    mockChatMessagesRepository.create.mockResolvedValue({ id: 'msg-1', content: 'test' });
    mockChatMessagesRepository.findRecentByThreadId.mockResolvedValue([]);
    mockChatThreadsRepository.findById.mockResolvedValue({
      id: 'thread-1',
      userId: 'user-1',
      systemPrompt: null,
      temperature: null,
      maxTokens: null,
      contextPackIds: [],
    });
    mockContextAssemblyManager.assemble.mockResolvedValue(mockContext);
    mockChatStreamService.emitCompletion.mockImplementation(() => {});
    mockChatStreamService.emitError.mockImplementation(() => {});

    mockResearchEnricherManager.enrichForOrchestration.mockResolvedValue({
      transcript: null,
      systemPrompt: '',
    });
    manager = new ConsensusExecutionManager(
      mockChatExecutionManager as any,
      mockContextAssemblyManager as any,
      mockChatMessagesRepository as any,
      mockChatThreadsRepository as any,
      mockChatStreamService as any,
      mockResearchEnricherManager as any,
      { recordUsage: jest.fn() } as any,
    );
  });

  describe('executeConsensus', () => {
    it('should store user message and return messageId', async () => {
      mockChatExecutionManager.callProvider.mockResolvedValue({
        provider: 'ANTHROPIC',
        model: 'claude-sonnet-4',
        content: 'Response A',
        latencyMs: 100,
        inputTokens: 10,
        outputTokens: 20,
      });

      const result = await manager.executeConsensus(
        'user-1',
        'thread-1',
        'test prompt',
        sampleModels,
      );

      expect(result.messageId).toBe('msg-1');
      expect(result.threadId).toBe('thread-1');
      expect(result.prompt).toBe('test prompt');
      expect(mockChatMessagesRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({ role: 'USER', content: 'test prompt' }),
      );
    });

    it('should return immediately without waiting for background execution', async () => {
      mockChatExecutionManager.callProvider.mockImplementation(
        () =>
          new Promise((resolve) =>
            setTimeout(
              () =>
                resolve({
                  provider: 'ANTHROPIC',
                  model: 'claude-sonnet-4',
                  content: 'Slow response',
                  latencyMs: 5000,
                  inputTokens: 10,
                  outputTokens: 20,
                }),
              100,
            ),
          ),
      );

      const start = Date.now();
      await manager.executeConsensus('user-1', 'thread-1', 'test prompt', sampleModels);
      const elapsed = Date.now() - start;

      expect(elapsed).toBeLessThan(50);
    });
  });

  describe('background synthesis', () => {
    it('clears the candidate timeout after a model completes', async () => {
      jest.useFakeTimers();
      try {
        mockChatExecutionManager.callProvider.mockResolvedValue({
          provider: 'ANTHROPIC',
          model: 'claude-sonnet-4',
          content: 'Response',
          latencyMs: 100,
          inputTokens: 5,
          outputTokens: 10,
        });
        const executeWithTimeout = Reflect.get(manager, 'executeWithTimeout');
        expect(typeof executeWithTimeout).toBe('function');
        if (typeof executeWithTimeout !== 'function') {
          throw new Error('Consensus candidate executor is unavailable');
        }

        await Reflect.apply(executeWithTimeout, manager, [
          'thread-1',
          sampleModels[0],
          1,
          1,
          mockContext,
          undefined,
        ]);

        expect(jest.getTimerCount()).toBe(0);
      } finally {
        jest.useRealTimers();
      }
    });

    it('should store model messages and synthesis message when all models succeed', async () => {
      // Use isolated mocks to prevent call-count leakage from other tests' background tasks
      const isolatedCreate = jest.fn().mockResolvedValue({ id: 'msg-1', content: 'test' });
      const isolatedRepo = { ...mockChatMessagesRepository, create: isolatedCreate };

      const responses = sampleModels.map((m, i) => ({
        provider: m.provider,
        model: m.model,
        content: `Response ${String(i + 1)} content`,
        latencyMs: 100,
        inputTokens: 10,
        outputTokens: 20,
      }));

      const isolatedCallProvider = jest
        .fn()
        .mockResolvedValueOnce(responses[0])
        .mockResolvedValueOnce(responses[1]);
      const isolatedExecManager = { callProvider: isolatedCallProvider };

      const isolatedManager = new ConsensusExecutionManager(
        isolatedExecManager as any,
        mockContextAssemblyManager as any,
        isolatedRepo as any,
        mockChatThreadsRepository as any,
        mockChatStreamService as any,
        mockResearchEnricherManager as any,
        { recordUsage: jest.fn() } as any,
      );

      // Mock Ollama synthesis to fail (test heuristic fallback path)
      globalThis.fetch = jest.fn().mockRejectedValue(new Error('Ollama unavailable'));

      await isolatedManager.executeConsensus('user-1', 'thread-1', 'test prompt', sampleModels);

      // Allow background execution to complete
      await new Promise((resolve) => setTimeout(resolve, 50));

      // Should have called create for: 1 user message + 2 model messages + 1 synthesis
      expect(isolatedCreate).toHaveBeenCalledTimes(4);

      globalThis.fetch = undefined as any;
    });

    it('should store both model messages before the synthesis message when exactly 2 models complete', async () => {
      // Use isolated mocks to avoid call-count leakage from other tests' background tasks
      const isolatedCreate = jest.fn().mockResolvedValue({ id: 'msg-1', content: 'test' });
      const isolatedRepo = { ...mockChatMessagesRepository, create: isolatedCreate };

      const isolatedCallProvider = jest
        .fn()
        .mockResolvedValueOnce({
          provider: 'ANTHROPIC',
          model: 'claude-sonnet-4',
          content: 'Response 1 content',
          latencyMs: 100,
          inputTokens: 10,
          outputTokens: 20,
        })
        .mockResolvedValueOnce({
          provider: 'OPENAI',
          model: 'gpt-4o',
          content: 'Response 2 content',
          latencyMs: 110,
          inputTokens: 10,
          outputTokens: 20,
        });
      const isolatedExecManager = { callProvider: isolatedCallProvider };

      const isolatedManager = new ConsensusExecutionManager(
        isolatedExecManager as any,
        mockContextAssemblyManager as any,
        isolatedRepo as any,
        mockChatThreadsRepository as any,
        mockChatStreamService as any,
        mockResearchEnricherManager as any,
        { recordUsage: jest.fn() } as any,
      );

      globalThis.fetch = jest.fn().mockRejectedValue(new Error('Ollama unavailable'));

      await isolatedManager.executeConsensus('user-1', 'thread-1', 'test prompt', sampleModels);
      await new Promise((resolve) => setTimeout(resolve, 50));

      const allCalls = isolatedCreate.mock.calls as Array<[any]>;

      const modelMessageCalls = allCalls.filter(
        (args) => args[0]?.metadata?.consensusExecution === true,
      );
      const synthCall = allCalls.find((args) => args[0]?.metadata?.consensusSynthesis === true);

      // 1 user + 2 model messages + 1 synthesis = 4 total
      expect(allCalls).toHaveLength(4);

      // Both model messages must be stored (ANTHROPIC + OPENAI)
      expect(modelMessageCalls).toHaveLength(2);
      const providers = modelMessageCalls.map((args) => args[0].provider);
      expect(providers).toContain('ANTHROPIC');
      expect(providers).toContain('OPENAI');

      // Synthesis must also be present
      expect(synthCall).toBeDefined();

      globalThis.fetch = undefined as any;
    });

    it('should store synthesis message with consensusSynthesis metadata', async () => {
      mockChatExecutionManager.callProvider.mockResolvedValue({
        provider: 'ANTHROPIC',
        model: 'claude-sonnet-4',
        content: 'Single response',
        latencyMs: 100,
        inputTokens: 5,
        outputTokens: 10,
      });

      // Second model fails
      mockChatExecutionManager.callProvider.mockRejectedValueOnce(new Error('Model failed'));
      mockChatExecutionManager.callProvider.mockResolvedValueOnce({
        provider: 'ANTHROPIC',
        model: 'claude-sonnet-4',
        content: 'Single response',
        latencyMs: 100,
        inputTokens: 5,
        outputTokens: 10,
      });

      await manager.executeConsensus('user-1', 'thread-1', 'test prompt', sampleModels);
      await new Promise((resolve) => setTimeout(resolve, 50));

      const synthCall = mockChatMessagesRepository.create.mock.calls.find((args: any[]) => {
        const meta = args[0]?.metadata;
        return meta?.consensusSynthesis === true;
      });

      expect(synthCall).toBeDefined();
      expect(synthCall[0].metadata.consensusSynthesis).toBe(true);
      expect(synthCall[0].metadata.consensusGroupId).toBeDefined();
    });

    it('should set synthesis consensusGroupId to match the user message id', async () => {
      mockChatMessagesRepository.create
        .mockResolvedValueOnce({ id: 'user-msg-id-123' }) // user message
        .mockResolvedValue({ id: 'model-msg-id' }); // model messages + synthesis

      mockChatExecutionManager.callProvider
        .mockResolvedValueOnce({
          provider: 'ANTHROPIC',
          model: 'claude-sonnet-4',
          content: 'Response A',
          latencyMs: 100,
          inputTokens: 10,
          outputTokens: 20,
        })
        .mockResolvedValueOnce({
          provider: 'OPENAI',
          model: 'gpt-4o',
          content: 'Response B',
          latencyMs: 120,
          inputTokens: 10,
          outputTokens: 20,
        });

      globalThis.fetch = jest.fn().mockRejectedValue(new Error('Ollama unavailable'));

      await manager.executeConsensus('user-1', 'thread-1', 'test prompt', sampleModels);
      await new Promise((resolve) => setTimeout(resolve, 50));

      const allCalls = mockChatMessagesRepository.create.mock.calls as Array<[any]>;

      const synthCall = allCalls.find((args) => args[0]?.metadata?.consensusSynthesis === true);

      expect(synthCall).toBeDefined();
      expect(synthCall![0].metadata?.consensusGroupId).toBe('user-msg-id-123');

      globalThis.fetch = undefined as any;
    });

    it('should emit completion after successful synthesis', async () => {
      mockChatExecutionManager.callProvider.mockResolvedValue({
        provider: 'ANTHROPIC',
        model: 'claude-sonnet-4',
        content: 'Response',
        latencyMs: 100,
        inputTokens: 5,
        outputTokens: 10,
      });

      globalThis.fetch = jest.fn().mockRejectedValue(new Error('Ollama unavailable'));

      await manager.executeConsensus('user-1', 'thread-1', 'test prompt', sampleModels);
      await new Promise((resolve) => setTimeout(resolve, 50));

      expect(mockChatStreamService.emitCompletion).toHaveBeenCalledWith(
        'thread-1',
        'consensus',
        'consensus',
      );

      globalThis.fetch = undefined as any;
    });

    it('should store fallback synthesis and emit error when execution fails entirely', async () => {
      mockChatMessagesRepository.create
        .mockResolvedValueOnce({ id: 'msg-1' })
        .mockRejectedValueOnce(new Error('DB error'));

      await manager.executeConsensus('user-1', 'thread-1', 'test prompt', sampleModels);
      await new Promise((resolve) => setTimeout(resolve, 50));

      expect(mockChatStreamService.emitError).toHaveBeenCalled();
    });
  });

  describe('heuristic synthesis (Ollama unavailable)', () => {
    beforeEach(() => {
      globalThis.fetch = jest.fn().mockRejectedValue(new Error('Ollama unavailable'));
    });

    afterEach(() => {
      globalThis.fetch = undefined as any;
    });

    it('should use longest response as finalAnswer in heuristic', async () => {
      mockChatExecutionManager.callProvider
        .mockResolvedValueOnce({
          provider: 'ANTHROPIC',
          model: 'claude-sonnet-4',
          content: 'Short',
          latencyMs: 100,
          inputTokens: 5,
          outputTokens: 5,
        })
        .mockResolvedValueOnce({
          provider: 'OPENAI',
          model: 'gpt-4o',
          content: 'Much longer response with more detail and information',
          latencyMs: 120,
          inputTokens: 5,
          outputTokens: 15,
        });

      await manager.executeConsensus('user-1', 'thread-1', 'test prompt', sampleModels);
      await new Promise((resolve) => setTimeout(resolve, 50));

      const synthCall = mockChatMessagesRepository.create.mock.calls.find(
        (args: any[]) => args[0]?.metadata?.consensusSynthesis === true,
      );
      expect(synthCall[0].content).toBe('Much longer response with more detail and information');
    });
  });
});
