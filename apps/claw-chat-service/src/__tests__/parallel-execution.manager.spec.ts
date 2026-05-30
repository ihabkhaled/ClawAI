import { AppConfig } from '../app/config/app.config';
import { ParallelExecutionManager } from '../modules/chat-messages/managers/parallel-execution.manager';
import type {
  ParallelModelResponse,
  ParallelModelTarget,
} from '../modules/chat-messages/types/parallel.types';
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

describe('ParallelExecutionManager', () => {
  let manager: ParallelExecutionManager;

  // streamModelForLane delegates to callProvider so test setups that mock
  // callProvider drive both the buffered + streaming code paths uniformly.
  // (ParallelExecutionManager now picks the streaming entry for streamable
  // providers; the buffered callProvider remains the fallback.) Explicit type
  // annotation breaks the self-referential implicit-any inference.
  const mockChatExecutionManager: {
    callProvider: jest.Mock;
    streamModelForLane: jest.Mock;
  } = {
    callProvider: jest.fn(),
    streamModelForLane: jest.fn(),
  };
  mockChatExecutionManager.streamModelForLane.mockImplementation((...args: unknown[]) =>
    mockChatExecutionManager.callProvider(...args),
  );

  const mockContextAssemblyManager = {
    assemble: jest.fn(),
  };

  const mockJudgeRefereeManager = {
    evaluate: jest.fn(),
    buildMetadata: jest.fn(),
  };

  const mockChatMessagesRepository = {
    create: jest.fn(),
    findRecentByThreadId: jest.fn(),
  };

  const mockChatThreadsRepository = {
    findById: jest.fn(),
  };

  const mockChatStreamService = {
    emitRequestAccepted: jest.fn(),
    emitProgressStage: jest.fn(),
    emitCompletion: jest.fn(),
    emitError: jest.fn(),
  };

  // Default to a no-op enricher that returns the original mode + empty
  // evidence so existing tests stay assertion-equivalent (compare path is
  // unchanged when researchMode is NONE / undefined).
  const mockResearchEnricherManager = {
    enrich: jest.fn().mockResolvedValue({ evidence: '', sources: [], mode: 'NONE' }),
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
    { provider: 'GEMINI', model: 'gemini-2.5-flash' },
  ];
  const disabledJudgeConfig = { enabled: false, model: null };

  beforeEach(() => {
    jest.clearAllMocks();

    mockChatMessagesRepository.create.mockResolvedValue({ id: 'msg-user-1' });
    mockChatMessagesRepository.findRecentByThreadId.mockResolvedValue([]);
    mockChatThreadsRepository.findById.mockResolvedValue({
      id: 'thread-1',
      systemPrompt: null,
      temperature: null,
      maxTokens: null,
      contextPackIds: [],
    });
    mockContextAssemblyManager.assemble.mockResolvedValue(mockContext);

    manager = new ParallelExecutionManager(
      mockChatExecutionManager as any,
      mockContextAssemblyManager as any,
      mockJudgeRefereeManager as any,
      mockChatMessagesRepository as any,
      mockChatThreadsRepository as any,
      mockChatStreamService as any,
      mockResearchEnricherManager as any,
    );
  });

  describe('executeParallel', () => {
    it('should create a user message and return response immediately', async () => {
      const result = await manager.executeParallel(
        'user-1',
        'thread-1',
        'Hello world',
        sampleModels,
        disabledJudgeConfig,
      );

      expect(mockChatMessagesRepository.create).toHaveBeenCalledWith({
        threadId: 'thread-1',
        role: 'USER',
        content: 'Hello world',
        metadata: {
          compareJudgeEnabled: false,
          compareJudgeModel: null,
        },
      });

      expect(result.messageId).toBe('msg-user-1');
      expect(result.threadId).toBe('thread-1');
      expect(result.prompt).toBe('Hello world');
    });

    it('should return empty responses initially', async () => {
      const result = await manager.executeParallel(
        'user-1',
        'thread-1',
        'Hello',
        sampleModels,
        disabledJudgeConfig,
      );

      expect(result.responses).toEqual([]);
      expect(result.totalLatencyMs).toBe(0);
      expect(result.completedCount).toBe(0);
      expect(result.failedCount).toBe(0);
    });

    it('should store fileIds in user message metadata when provided', async () => {
      await manager.executeParallel(
        'user-1',
        'thread-1',
        'Analyze this',
        sampleModels,
        disabledJudgeConfig,
        ['file-1', 'file-2'],
      );

      expect(mockChatMessagesRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          metadata: {
            compareJudgeEnabled: false,
            compareJudgeModel: null,
            fileIds: ['file-1', 'file-2'],
          },
        }),
      );
    });
  });

  describe('executeAllModels', () => {
    it('should run multiple models in parallel and return all results', async () => {
      mockChatExecutionManager.callProvider
        .mockResolvedValueOnce({
          content: 'Response from Anthropic',
          provider: 'ANTHROPIC',
          model: 'claude-sonnet-4',
          latencyMs: 1500,
          inputTokens: 100,
          outputTokens: 200,
        })
        .mockResolvedValueOnce({
          content: 'Response from Gemini',
          provider: 'GEMINI',
          model: 'gemini-2.5-flash',
          latencyMs: 1000,
          inputTokens: 100,
          outputTokens: 150,
        });

      // Access private method via bracket notation (test pattern)
      const results: ParallelModelResponse[] = await (manager as any).executeAllModels(
        sampleModels,
        mockContext,
        disabledJudgeConfig,
        'group-1',
        'thread-1',
      );

      expect(results).toHaveLength(2);
      expect(results[0]!.status).toBe('completed');
      expect(results[0]!.content).toBe('Response from Anthropic');
      expect(results[1]!.status).toBe('completed');
      expect(results[1]!.content).toBe('Response from Gemini');
    });

    it('should return results for all models even if some fail', async () => {
      mockChatExecutionManager.callProvider
        .mockResolvedValueOnce({
          content: 'Success',
          provider: 'ANTHROPIC',
          model: 'claude-sonnet-4',
          latencyMs: 1500,
          inputTokens: 100,
          outputTokens: 200,
        })
        .mockRejectedValueOnce(new Error('Provider timeout'));

      const results: ParallelModelResponse[] = await (manager as any).executeAllModels(
        sampleModels,
        mockContext,
        disabledJudgeConfig,
        'group-1',
        'thread-1',
      );

      expect(results).toHaveLength(2);
      expect(results[0]!.status).toBe('completed');
      expect(results[0]!.content).toBe('Success');
      expect(results[1]!.status).toBe('failed');
      expect(results[1]!.errorMessage).toBe('Provider timeout');
    });

    it('should handle all models failing', async () => {
      mockChatExecutionManager.callProvider
        .mockRejectedValueOnce(new Error('Timeout'))
        .mockRejectedValueOnce(new Error('Rate limited'));

      const results: ParallelModelResponse[] = await (manager as any).executeAllModels(
        sampleModels,
        mockContext,
        disabledJudgeConfig,
        'group-1',
        'thread-1',
      );

      expect(results).toHaveLength(2);
      expect(results[0]!.status).toBe('failed');
      expect(results[0]!.errorMessage).toBe('Timeout');
      expect(results[1]!.status).toBe('failed');
      expect(results[1]!.errorMessage).toBe('Rate limited');
    });

    it('should use provider and model from target for failed results', async () => {
      mockChatExecutionManager.callProvider.mockRejectedValue(new Error('fail'));

      const results: ParallelModelResponse[] = await (manager as any).executeAllModels(
        sampleModels,
        mockContext,
        disabledJudgeConfig,
        'group-1',
        'thread-1',
      );

      expect(results[0]!.provider).toBe('ANTHROPIC');
      expect(results[0]!.model).toBe('claude-sonnet-4');
      expect(results[1]!.provider).toBe('GEMINI');
      expect(results[1]!.model).toBe('gemini-2.5-flash');
    });
  });

  describe('executeSingleModel', () => {
    it('should return completed status with content on success', async () => {
      mockChatExecutionManager.callProvider.mockResolvedValue({
        content: 'Great answer',
        provider: 'ANTHROPIC',
        model: 'claude-sonnet-4',
        latencyMs: 800,
        inputTokens: 50,
        outputTokens: 100,
      });

      const target: ParallelModelTarget = { provider: 'ANTHROPIC', model: 'claude-sonnet-4' };
      const result: ParallelModelResponse = await (manager as any).executeSingleModel(
        target,
        mockContext,
      );

      expect(result.status).toBe('completed');
      expect(result.content).toBe('Great answer');
      expect(result.provider).toBe('ANTHROPIC');
      expect(result.model).toBe('claude-sonnet-4');
      expect(result.errorMessage).toBeNull();
    });

    it('should include token counts from LLM response', async () => {
      mockChatExecutionManager.callProvider.mockResolvedValue({
        content: 'Answer',
        provider: 'GEMINI',
        model: 'gemini-2.5-flash',
        latencyMs: 600,
        inputTokens: 75,
        outputTokens: 120,
      });

      const target: ParallelModelTarget = { provider: 'GEMINI', model: 'gemini-2.5-flash' };
      const result: ParallelModelResponse = await (manager as any).executeSingleModel(
        target,
        mockContext,
      );

      expect(result.inputTokens).toBe(75);
      expect(result.outputTokens).toBe(120);
    });

    it('should return failed status with error message on error', async () => {
      mockChatExecutionManager.callProvider.mockRejectedValue(new Error('Connection refused'));

      const target: ParallelModelTarget = { provider: 'ANTHROPIC', model: 'claude-sonnet-4' };
      const result: ParallelModelResponse = await (manager as any).executeSingleModel(
        target,
        mockContext,
      );

      expect(result.status).toBe('failed');
      expect(result.errorMessage).toBe('Connection refused');
      expect(result.content).toBe('');
      expect(result.provider).toBe('ANTHROPIC');
      expect(result.model).toBe('claude-sonnet-4');
    });

    it('should handle non-Error thrown values', async () => {
      mockChatExecutionManager.callProvider.mockRejectedValue('string error');

      const target: ParallelModelTarget = { provider: 'ANTHROPIC', model: 'claude-sonnet-4' };
      const result: ParallelModelResponse = await (manager as any).executeSingleModel(
        target,
        mockContext,
      );

      expect(result.status).toBe('failed');
      expect(result.errorMessage).toBe('Unknown error');
    });

    it('should measure latency even on failure', async () => {
      mockChatExecutionManager.callProvider.mockRejectedValue(new Error('fail'));

      const target: ParallelModelTarget = { provider: 'ANTHROPIC', model: 'claude-sonnet-4' };
      const result: ParallelModelResponse = await (manager as any).executeSingleModel(
        target,
        mockContext,
      );

      expect(result.latencyMs).toBeGreaterThanOrEqual(0);
    });

    it('should set null tokens for responses without token data', async () => {
      mockChatExecutionManager.callProvider.mockResolvedValue({
        content: 'Answer',
        provider: 'ANTHROPIC',
        model: 'claude-sonnet-4',
        latencyMs: 500,
        inputTokens: undefined,
        outputTokens: undefined,
      });

      const target: ParallelModelTarget = { provider: 'ANTHROPIC', model: 'claude-sonnet-4' };
      const result: ParallelModelResponse = await (manager as any).executeSingleModel(
        target,
        mockContext,
      );

      expect(result.inputTokens).toBeNull();
      expect(result.outputTokens).toBeNull();
    });
  });

  describe('storeAssistantMessages', () => {
    it('should create messages in DB with correct metadata', async () => {
      const responses: ParallelModelResponse[] = [
        {
          provider: 'ANTHROPIC',
          model: 'claude-sonnet-4',
          content: 'Anthropic response',
          latencyMs: 1500,
          inputTokens: 100,
          outputTokens: 200,
          status: 'completed',
          errorMessage: null,
        },
        {
          provider: 'GEMINI',
          model: 'gemini-2.5-flash',
          content: 'Gemini response',
          latencyMs: 1000,
          inputTokens: 80,
          outputTokens: 150,
          status: 'completed',
          errorMessage: null,
        },
      ];

      await (manager as any).storeAssistantMessages('thread-1', 'group-1', responses);

      expect(mockChatMessagesRepository.create).toHaveBeenCalledTimes(2);

      expect(mockChatMessagesRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          threadId: 'thread-1',
          role: 'ASSISTANT',
          content: 'Anthropic response',
          provider: 'ANTHROPIC',
          model: 'claude-sonnet-4',
          inputTokens: 100,
          outputTokens: 200,
          latencyMs: 1500,
          usedFallback: false,
          metadata: expect.objectContaining({
            parallelExecution: true,
            parallelGroupId: 'group-1',
            status: 'completed',
            routeRoadmap: expect.objectContaining({
              finalProvider: 'ANTHROPIC',
              finalModel: 'claude-sonnet-4',
            }),
            progressSummary: expect.arrayContaining([
              expect.objectContaining({ label: 'Request accepted', status: 'completed' }),
              expect.objectContaining({ label: 'Response complete', status: 'completed' }),
            ]),
          }),
        }),
      );

      expect(mockChatMessagesRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          threadId: 'thread-1',
          role: 'ASSISTANT',
          content: 'Gemini response',
          provider: 'GEMINI',
          model: 'gemini-2.5-flash',
          metadata: expect.objectContaining({
            parallelExecution: true,
            parallelGroupId: 'group-1',
            status: 'completed',
            routeRoadmap: expect.objectContaining({
              finalProvider: 'GEMINI',
              finalModel: 'gemini-2.5-flash',
            }),
          }),
        }),
      );
    });

    it('should store failed responses with error content', async () => {
      const responses: ParallelModelResponse[] = [
        {
          provider: 'ANTHROPIC',
          model: 'claude-sonnet-4',
          content: '',
          latencyMs: 0,
          inputTokens: null,
          outputTokens: null,
          status: 'failed',
          errorMessage: 'Provider timeout',
        },
      ];

      await (manager as any).storeAssistantMessages('thread-1', 'group-1', responses);

      expect(mockChatMessagesRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          content: 'Error: Provider timeout',
          metadata: expect.objectContaining({
            parallelExecution: true,
            parallelGroupId: 'group-1',
            status: 'failed',
            progressSummary: expect.arrayContaining([
              expect.objectContaining({ label: 'Response failed', status: 'error' }),
            ]),
          }),
        }),
      );
    });

    it('should store all responses even if some failed', async () => {
      const responses: ParallelModelResponse[] = [
        {
          provider: 'ANTHROPIC',
          model: 'claude-sonnet-4',
          content: 'Success',
          latencyMs: 1200,
          inputTokens: 50,
          outputTokens: 100,
          status: 'completed',
          errorMessage: null,
        },
        {
          provider: 'GEMINI',
          model: 'gemini-2.5-flash',
          content: '',
          latencyMs: 0,
          inputTokens: null,
          outputTokens: null,
          status: 'failed',
          errorMessage: 'Rate limited',
        },
      ];

      await (manager as any).storeAssistantMessages('thread-1', 'group-1', responses);

      expect(mockChatMessagesRepository.create).toHaveBeenCalledTimes(2);
    });

    it('should handle failed response with null errorMessage', async () => {
      const responses: ParallelModelResponse[] = [
        {
          provider: 'ANTHROPIC',
          model: 'claude-sonnet-4',
          content: '',
          latencyMs: 0,
          inputTokens: null,
          outputTokens: null,
          status: 'failed',
          errorMessage: null,
        },
      ];

      await (manager as any).storeAssistantMessages('thread-1', 'group-1', responses);

      expect(mockChatMessagesRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          content: 'Error: Unknown error',
        }),
      );
    });
  });

  describe('buildFailedResponse', () => {
    it('should return correct shape with status failed', () => {
      const result: ParallelModelResponse = (manager as any).buildFailedResponse(
        'ANTHROPIC',
        'claude-sonnet-4',
        'Connection refused',
      );

      expect(result.provider).toBe('ANTHROPIC');
      expect(result.model).toBe('claude-sonnet-4');
      expect(result.status).toBe('failed');
      expect(result.errorMessage).toBe('Connection refused');
      expect(result.content).toBe('');
      expect(result.inputTokens).toBeNull();
      expect(result.outputTokens).toBeNull();
    });

    it('should use provided latencyMs when given', () => {
      const result: ParallelModelResponse = (manager as any).buildFailedResponse(
        'GEMINI',
        'gemini-2.5-flash',
        'Timeout',
        5000,
      );

      expect(result.latencyMs).toBe(5000);
    });

    it('should default latencyMs to 0 when not provided', () => {
      const result: ParallelModelResponse = (manager as any).buildFailedResponse(
        'GEMINI',
        'gemini-2.5-flash',
        'Error',
      );

      expect(result.latencyMs).toBe(0);
    });
  });

  describe('executeInBackground', () => {
    it('should assemble context, execute models, store results, and emit completion', async () => {
      mockChatExecutionManager.callProvider.mockResolvedValue({
        content: 'Response',
        provider: 'ANTHROPIC',
        model: 'claude-sonnet-4',
        latencyMs: 1000,
        inputTokens: 50,
        outputTokens: 100,
      });

      await (manager as any).executeInBackground(
        'user-1',
        'thread-1',
        'group-1',
        'user prompt',
        [{ provider: 'ANTHROPIC', model: 'claude-sonnet-4' }],
        disabledJudgeConfig,
      );

      expect(mockContextAssemblyManager.assemble).toHaveBeenCalled();
      expect(mockChatExecutionManager.callProvider).toHaveBeenCalledTimes(1);
      // 1 from executeParallel user message setup is not counted here since beforeEach resets
      // storeAssistantMessages creates messages for the responses
      expect(mockChatMessagesRepository.create).toHaveBeenCalled();
      expect(mockChatStreamService.emitCompletion).toHaveBeenCalledWith(
        'thread-1',
        'parallel',
        'parallel',
      );
    });

    it('should store error message and emit error when background execution fails', async () => {
      mockChatThreadsRepository.findById.mockRejectedValue(new Error('DB connection lost'));

      await (manager as any).executeInBackground(
        'user-1',
        'thread-1',
        'group-1',
        'user prompt',
        sampleModels,
        disabledJudgeConfig,
      );

      // Should store a failed response
      expect(mockChatMessagesRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          content: expect.stringContaining('Parallel execution failed'),
          metadata: expect.objectContaining({
            parallelExecution: true,
            status: 'failed',
          }),
        }),
      );

      expect(mockChatStreamService.emitError).toHaveBeenCalledWith(
        'thread-1',
        expect.stringContaining('Parallel execution failed'),
      );
    });
  });

  describe('extractThreadSettings', () => {
    it('should return undefined for null thread', () => {
      const result = (manager as any).extractThreadSettings(null);
      expect(result).toBeUndefined();
    });

    it('should extract settings from thread', () => {
      const thread = {
        systemPrompt: 'You are helpful',
        temperature: 0.7,
        maxTokens: 2048,
      };

      const result = (manager as any).extractThreadSettings(thread);

      expect(result).toEqual({
        systemPrompt: 'You are helpful',
        temperature: 0.7,
        maxTokens: 2048,
      });
    });

    it('should handle thread with null settings', () => {
      const thread = {
        systemPrompt: null,
        temperature: null,
        maxTokens: null,
      };

      const result = (manager as any).extractThreadSettings(thread);

      expect(result).toEqual({
        systemPrompt: null,
        temperature: null,
        maxTokens: null,
      });
    });
  });
});
