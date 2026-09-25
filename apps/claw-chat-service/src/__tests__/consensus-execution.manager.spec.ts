import { vi } from 'vitest';
import { AppConfig } from '../app/config/app.config';
import { ConsensusExecutionManager } from '../modules/chat-messages/managers/consensus-execution.manager';
import type { ParallelModelTarget } from '../modules/chat-messages/types/parallel.types';
import type { AssembledContext } from '../modules/chat-messages/types/context.types';
import { createFakePaygAccessControl } from '../modules/chat-messages/__tests__/helpers/fake-payg-access-control.helper';
import {
  disabledCrossThreadResult,
  emptyConversationManifest,
  fallbackModelTokenBudget,
} from '../modules/chat-messages/utilities/assembled-context.utility';

vi.spyOn(AppConfig, 'get').mockReturnValue({
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
    callProvider: vi.fn(),
  };

  // The gateway now owns what these managers used to assemble by hand. It
  // delegates to the same assembler mock so existing context assertions still
  // describe what the mode sends.
  const mockChatContextGateway = {
    build: vi.fn(async () => ({
      context: await mockContextAssemblyManager.assemble(),
      thread: await mockChatThreadsRepository.findById(),
      threadSettings: undefined,
      messages: [],
      fileIds: [],
      latestUserMetadata: null,
    })),
  };

  const mockContextAssemblyManager = {
    assemble: vi.fn(),
  };

  const mockChatMessagesRepository = {
    create: vi.fn(),
    findRecentByThreadId: vi.fn(),
  };

  const mockChatThreadsRepository = {
    findById: vi.fn(),
  };

  const mockChatStreamService = {
    emitCompletion: vi.fn(),
    emitError: vi.fn(),
  };

  // Universal-research PR2: research-enricher dependency.
  const mockResearchEnricherManager = {
    enrichForOrchestration: vi.fn().mockResolvedValue({ transcript: null, systemPrompt: '' }),
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
    modelBudget: fallbackModelTokenBudget(),
    conversationManifest: emptyConversationManifest(),
    crossThread: disabledCrossThreadResult(),
    researchEvidence: [],
    researchRunId: null,
    researchWarnings: [],
    researchRequested: false,
    researchToolsUsed: [],
  };

  const sampleModels: ParallelModelTarget[] = [
    { provider: 'ANTHROPIC', model: 'claude-sonnet-4' },
    { provider: 'OPENAI', model: 'gpt-4o' },
  ];

  beforeEach(() => {
    vi.clearAllMocks();

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
      mockChatContextGateway as any,
      mockChatMessagesRepository as any,
      mockChatStreamService as any,
      mockResearchEnricherManager as any,
      createFakePaygAccessControl() as any,
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
      vi.useFakeTimers();
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

        expect(vi.getTimerCount()).toBe(0);
      } finally {
        vi.useRealTimers();
      }
    });

    it('should store model messages and synthesis message when all models succeed', async () => {
      // Use isolated mocks to prevent call-count leakage from other tests' background tasks
      const isolatedCreate = vi.fn().mockResolvedValue({ id: 'msg-1', content: 'test' });
      const isolatedRepo = { ...mockChatMessagesRepository, create: isolatedCreate };

      const responses = sampleModels.map((m, i) => ({
        provider: m.provider,
        model: m.model,
        content: `Response ${String(i + 1)} content`,
        latencyMs: 100,
        inputTokens: 10,
        outputTokens: 20,
      }));

      const isolatedCallProvider = vi
        .fn()
        .mockResolvedValueOnce(responses[0])
        .mockResolvedValueOnce(responses[1]);
      const isolatedExecManager = { callProvider: isolatedCallProvider };

      const isolatedManager = new ConsensusExecutionManager(
        isolatedExecManager as any,
        mockChatContextGateway as any,
        isolatedRepo as any,
        mockChatStreamService as any,
        mockResearchEnricherManager as any,
        createFakePaygAccessControl() as any,
      );

      // Mock Ollama synthesis to fail (test heuristic fallback path)
      globalThis.fetch = vi.fn().mockRejectedValue(new Error('Ollama unavailable'));

      await isolatedManager.executeConsensus('user-1', 'thread-1', 'test prompt', sampleModels);

      // Allow background execution to complete
      await new Promise((resolve) => setTimeout(resolve, 50));

      // Should have called create for: 1 user message + 2 model messages + 1 synthesis
      expect(isolatedCreate).toHaveBeenCalledTimes(4);

      globalThis.fetch = undefined as any;
    });

    it('should store both model messages before the synthesis message when exactly 2 models complete', async () => {
      // Use isolated mocks to avoid call-count leakage from other tests' background tasks
      const isolatedCreate = vi.fn().mockResolvedValue({ id: 'msg-1', content: 'test' });
      const isolatedRepo = { ...mockChatMessagesRepository, create: isolatedCreate };

      const isolatedCallProvider = vi
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
        mockChatContextGateway as any,
        isolatedRepo as any,
        mockChatStreamService as any,
        mockResearchEnricherManager as any,
        createFakePaygAccessControl() as any,
      );

      globalThis.fetch = vi.fn().mockRejectedValue(new Error('Ollama unavailable'));

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
      expect(synthCall?.[0].metadata.consensusSynthesis).toBe(true);
      expect(synthCall?.[0].metadata.consensusGroupId).toBeDefined();
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

      globalThis.fetch = vi.fn().mockRejectedValue(new Error('Ollama unavailable'));

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

      globalThis.fetch = vi.fn().mockRejectedValue(new Error('Ollama unavailable'));

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
      globalThis.fetch = vi.fn().mockRejectedValue(new Error('Ollama unavailable'));
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
      expect(synthCall).toBeDefined();
      expect(synthCall?.[0].content).toBe('Much longer response with more detail and information');
    });
  });

  // 2026-09-23 fabrication report: kimi-k3 gave a long, confident, zero-
  // citation answer with fabricated prices; grok said "unknown" honestly with
  // no citations either (its own search found nothing real to cite); the
  // synthesis step picked the longer, uncited fabrication because
  // buildHeuristicSynthesis/buildSynthesisResult both picked "longest
  // content" with no idea whether a lane had grounded on evidence at all.
  describe('citation-aware grounding synthesis (fabrication guard)', () => {
    beforeEach(() => {
      globalThis.fetch = vi.fn().mockRejectedValue(new Error('Ollama unavailable'));
      // Simulate a run where research evidence WAS actually injected — the
      // signal `hasResearchEvidence` is derived from in consensus-execution.
      mockResearchEnricherManager.enrichForOrchestration.mockResolvedValue({
        transcript: null,
        systemPrompt:
          '## Web research evidence (mode: SEARCH, gathered now)\n[1] claw-ai.co — https://claw-ai.co\nPaid plans from $5/month.',
      });
    });

    afterEach(() => {
      globalThis.fetch = undefined as any;
    });

    it('prefers a short, cited answer over a longer, zero-citation one when this run had web evidence', async () => {
      mockChatExecutionManager.callProvider
        .mockResolvedValueOnce({
          provider: 'ANTHROPIC',
          model: 'claude-sonnet-4',
          content:
            'ClawAI Ultra is $200/month billed annually, or $250/month billed monthly, with a 3-tier Ultra/Pro/Basic comparison and full feature breakdown across every plan tier available today.',
          latencyMs: 100,
          inputTokens: 5,
          outputTokens: 40,
        })
        .mockResolvedValueOnce({
          provider: 'OPENAI',
          model: 'gpt-4o',
          content: 'From the crawled homepage [1]: paid plans start at $5/month.',
          latencyMs: 120,
          inputTokens: 5,
          outputTokens: 15,
        });

      await manager.executeConsensus('user-1', 'thread-1', 'test prompt', sampleModels);
      await new Promise((resolve) => setTimeout(resolve, 50));

      const synthCall = mockChatMessagesRepository.create.mock.calls.find(
        (args: any[]) => args[0]?.metadata?.consensusSynthesis === true,
      );
      expect(synthCall).toBeDefined();
      // The longer answer has zero [n] markers and invented numbers; the
      // shorter one cites the evidence. The cited one must win even though
      // it is shorter.
      expect(synthCall?.[0].content).toBe(
        'From the crawled homepage [1]: paid plans start at $5/month.',
      );
    });

    it('falls back to the longest response when NEITHER lane cited anything, even with evidence present', async () => {
      mockChatExecutionManager.callProvider
        .mockResolvedValueOnce({
          provider: 'ANTHROPIC',
          model: 'claude-sonnet-4',
          content: 'No verified prices found.',
          latencyMs: 100,
          inputTokens: 5,
          outputTokens: 5,
        })
        .mockResolvedValueOnce({
          provider: 'OPENAI',
          model: 'gpt-4o',
          content: 'No verified prices found on the homepage after searching multiple times.',
          latencyMs: 120,
          inputTokens: 5,
          outputTokens: 15,
        });

      await manager.executeConsensus('user-1', 'thread-1', 'test prompt', sampleModels);
      await new Promise((resolve) => setTimeout(resolve, 50));

      const synthCall = mockChatMessagesRepository.create.mock.calls.find(
        (args: any[]) => args[0]?.metadata?.consensusSynthesis === true,
      );
      expect(synthCall).toBeDefined();
      expect(synthCall?.[0].content).toBe(
        'No verified prices found on the homepage after searching multiple times.',
      );
    });
  });

  // Rule 42 §18. The synthesis call reads no conversation — only the prompt it
  // is handed — so an attachment-only send synthesised against "". It now gets
  // the spelled-out request.
  describe('an attachment-only send', () => {
    it('synthesises against the attachment request, not an empty prompt', async () => {
      // The prompt the synthesis step is handed, captured without touching the
      // network (the Ollama URL's host allowlist differs between shells).
      const synthesisPrompts: string[] = [];
      globalThis.fetch = vi.fn(async () => {
        throw new Error('Ollama unavailable');
      }) as typeof fetch;
      mockContextAssemblyManager.assemble.mockResolvedValue({
        ...mockContext,
        fileContents: [
          {
            id: 'f-1',
            filename: 'clip.mp4',
            mimeType: 'video/mp4',
            content: null,
            extractedText: 'TRANSCRIPT [00:01] hello',
            ingestionStatus: 'COMPLETED',
            extractionError: null,
          },
        ],
      });
      const callProvider = vi.fn(async (provider: string, model: string) => ({
        provider,
        model,
        content: `${model} describes the clip`,
        latencyMs: 10,
        inputTokens: 1,
        outputTokens: 1,
      }));
      const isolated = new ConsensusExecutionManager(
        { callProvider } as never,
        mockChatContextGateway as never,
        mockChatMessagesRepository as never,
        mockChatStreamService as never,
        mockResearchEnricherManager as never,
        createFakePaygAccessControl() as never,
      );
      const synthesize: unknown = Reflect.get(isolated, 'synthesize');
      if (typeof synthesize !== 'function') {
        throw new Error('Consensus synthesis step is unavailable');
      }
      Reflect.set(isolated, 'synthesize', async (prompt: string, ...rest: unknown[]) => {
        synthesisPrompts.push(prompt);
        return Reflect.apply(synthesize, isolated, [prompt, ...rest]);
      });

      await isolated.executeConsensus('user-1', 'thread-1', '', sampleModels, ['f-1']);
      await vi.waitFor(
        () => {
          expect(synthesisPrompts.length).toBeGreaterThan(0);
        },
        { timeout: 10_000 },
      );

      expect(synthesisPrompts[0]).toContain('[Attachment-only message]');
      expect(synthesisPrompts[0]).toContain('For a video');
      globalThis.fetch = undefined as never;
    });
  });
});
