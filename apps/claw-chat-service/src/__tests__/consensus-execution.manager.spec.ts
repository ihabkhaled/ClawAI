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

  const mockContext: AssembledContext = {
    userId: 'user-1',
    systemPrompt: null,
    threadMessages: [],
    memories: [],
    contextPackItems: [],
    fileContents: [],
    tokenBudget: 4096,
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

    manager = new ConsensusExecutionManager(
      mockChatExecutionManager as any,
      mockContextAssemblyManager as any,
      mockChatMessagesRepository as any,
      mockChatThreadsRepository as any,
      mockChatStreamService as any,
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
    it('should store model messages and synthesis message when all models succeed', async () => {
      const responses = sampleModels.map((m, i) => ({
        provider: m.provider,
        model: m.model,
        content: `Response ${String(i + 1)} content`,
        latencyMs: 100,
        inputTokens: 10,
        outputTokens: 20,
      }));

      mockChatExecutionManager.callProvider
        .mockResolvedValueOnce(responses[0])
        .mockResolvedValueOnce(responses[1]);

      // Mock Ollama synthesis to fail (test heuristic fallback path)
      const originalFetch = globalThis.fetch;
      globalThis.fetch = jest.fn().mockRejectedValue(new Error('Ollama unavailable'));

      await manager.executeConsensus('user-1', 'thread-1', 'test prompt', sampleModels);

      // Allow background execution to complete
      await new Promise((resolve) => setTimeout(resolve, 50));

      // Should have called create for: 1 user message + 2 model messages + 1 synthesis
      expect(mockChatMessagesRepository.create).toHaveBeenCalledTimes(4);

      globalThis.fetch = originalFetch;
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
