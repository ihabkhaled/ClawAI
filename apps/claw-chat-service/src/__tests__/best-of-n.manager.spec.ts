import { type Mock, vi } from 'vitest';
import { ModelSelectionMode } from '../common/enums/model-selection-mode.enum';
import { BusinessException } from '../common/errors/business.exception';
import { BestOfNManager } from '../modules/chat-messages/managers/best-of-n.manager';
import { type ChatMessagesRepository } from '../modules/chat-messages/repositories/chat-messages.repository';
import { type ChatThreadsRepository } from '../modules/chat-threads/repositories/chat-threads.repository';
import { type ChatStreamService } from '../modules/chat-messages/services/chat-stream.service';
import { type QualityCheckManager } from '../modules/chat-messages/managers/quality-check.manager';
import { type AdvancedModuleModelSelectionService } from '../modules/chat-messages/services/advanced-module-model-selection.service';
import { bestOfNMessageSchema } from '../modules/chat-messages/dto/best-of-n-message.dto';
import * as httpClientModule from '../common/utilities/http-client.utility';
import type { AdvancedModelSelectionResolution } from '../modules/chat-messages/types/advanced-model-selection.types';

vi.mock('../modules/chat-messages/managers/best-of-n.manager', async () => {
  const actual = await vi.importActual<{ BestOfNManager: typeof BestOfNManager }>(
    '../modules/chat-messages/managers/best-of-n.manager',
  );
  return actual;
});

vi.mock('../app/config/app.config', () => ({
  AppConfig: {
    get: vi.fn().mockReturnValue({
      OLLAMA_SERVICE_URL: 'http://localhost:11434',
    }),
  },
}));

vi.mock('../common/utilities/http-client.utility', () => ({
  httpRequest: vi.fn().mockResolvedValue({
    ok: true,
    status: 200,
    data: { response: 'mocked response content' },
  }),
}));

const mockThread = {
  id: 'thread-best-1',
  userId: 'user-1',
  title: 'Best-of-N: test',
  routingMode: 'AUTO' as const,
  lastProvider: null,
  lastModel: null,
  preferredProvider: null,
  preferredModel: null,
  isPinned: false,
  isArchived: false,
  systemPrompt: null,
  temperature: 0.7,
  maxTokens: null,
  createdAt: new Date(),
  updatedAt: new Date(),
};

const mockUserMessage = {
  id: 'msg-user-1',
  threadId: 'thread-best-1',
  role: 'USER' as const,
  content: 'test prompt',
  provider: null,
  model: null,
  routingMode: null,
  routerModel: null,
  usedFallback: false,
  inputTokens: null,
  outputTokens: null,
  estimatedCost: null,
  latencyMs: null,
  feedback: null,
  metadata: null,
  createdAt: new Date(),
};

const mockAssistantMessage = {
  id: 'msg-assistant-1',
  threadId: 'thread-best-1',
  role: 'ASSISTANT' as const,
  content: 'best response',
  provider: 'local-ollama',
  model: 'AUTO',
  routingMode: 'AUTO' as const,
  routerModel: null,
  usedFallback: false,
  inputTokens: null,
  outputTokens: null,
  estimatedCost: null,
  latencyMs: 100,
  feedback: null,
  metadata: { bestOfN: true, candidates: [], bestRank: 1 },
  createdAt: new Date(),
};

const mockMessagesRepository = (): Partial<Record<keyof ChatMessagesRepository, Mock>> => ({
  create: vi.fn(),
});

const mockThreadsRepository = (): Partial<Record<keyof ChatThreadsRepository, Mock>> => ({
  create: vi.fn(),
  findById: vi.fn(),
});

const mockStreamService = (): Partial<Record<keyof ChatStreamService, Mock>> => ({
  emitCompletion: vi.fn(),
  emitError: vi.fn(),
});

const mockQualityCheckManager = (): Partial<Record<keyof QualityCheckManager, Mock>> => ({
  checkResponseQuality: vi.fn().mockReturnValue({ score: 0.8, reasons: [], isWeak: false }),
});

// Universal-research PR2: stub for the new ResearchEnricherManager dependency.
const mockResearchEnricherManager = {
  enrichForOrchestration: vi.fn().mockResolvedValue({ transcript: null, systemPrompt: '' }),
};

const mockChatContextGateway = {
  build: vi.fn(async () => ({
    context: {
      userId: 'user-1',
      systemPrompt: null,
      threadMessages: [],
      memories: [],
      contextPackItems: [],
      fileContents: [],
      workspaceCitations: [],
      researchEvidence: [],
    },
    thread: { id: 'thread-1' },
    threadSettings: undefined,
    messages: [],
    fileIds: [],
    latestUserMetadata: null,
  })),
};

// Every candidate now goes through the same chokepoint a chat turn uses, so
// the spec asserts on this rather than on a hand-built Ollama request body.
const mockModeExecutionGateway = {
  run: vi.fn(async () => ({
    content: 'candidate answer',
    provider: 'local-ollama',
    model: 'gemma3:4b',
    inputTokens: 10,
    outputTokens: 20,
  })),
};

describe('BestOfNManager', () => {
  let manager: BestOfNManager;
  let messagesRepo: ReturnType<typeof mockMessagesRepository>;
  let threadsRepo: ReturnType<typeof mockThreadsRepository>;
  let streamService: ReturnType<typeof mockStreamService>;
  let qualityManager: ReturnType<typeof mockQualityCheckManager>;

  beforeEach(() => {
    messagesRepo = mockMessagesRepository();
    threadsRepo = mockThreadsRepository();
    streamService = mockStreamService();
    qualityManager = mockQualityCheckManager();
    mockResearchEnricherManager.enrichForOrchestration.mockResolvedValue({
      transcript: null,
      systemPrompt: '',
    });

    manager = new BestOfNManager(
      messagesRepo as unknown as ChatMessagesRepository,
      threadsRepo as unknown as ChatThreadsRepository,
      streamService as unknown as ChatStreamService,
      qualityManager as unknown as QualityCheckManager,
      mockChatContextGateway as any,
      mockModeExecutionGateway as any,
      mockResearchEnricherManager as any,
    );

    vi.clearAllMocks();
    mockChatContextGateway.build.mockResolvedValue({
      context: {
        userId: 'user-1',
        systemPrompt: null,
        threadMessages: [],
        memories: [],
        contextPackItems: [],
        fileContents: [],
        workspaceCitations: [],
        researchEvidence: [],
      },
      thread: { id: 'thread-1' },
      threadSettings: undefined,
      messages: [],
      fileIds: [],
      latestUserMetadata: null,
    });
    mockModeExecutionGateway.run.mockResolvedValue({
      content: 'candidate answer',
      provider: 'local-ollama',
      model: 'gemma3:4b',
      inputTokens: 10,
      outputTokens: 20,
    });
    (httpClientModule.httpRequest as Mock).mockResolvedValue({
      ok: true,
      status: 200,
      data: { response: 'mocked response content' },
    });
  });

  describe('executeBestOfN', () => {
    it('should return messageId and threadId', async () => {
      messagesRepo.create!.mockResolvedValue(mockUserMessage);

      const result = await manager.executeBestOfN(
        'user-1',
        {
          content: 'test prompt',
          threadId: 'thread-best-1',
          n: 3,
          models: undefined,
        },
        '',
      );

      expect(result).toHaveProperty('messageId');
      expect(result).toHaveProperty('threadId', 'thread-best-1');
    });

    it('forwards dto.fileIds to executeInBackground', async () => {
      messagesRepo.create!.mockResolvedValue(mockUserMessage);
      const backgroundSpy = vi.spyOn(manager, 'executeInBackground').mockResolvedValue(undefined);

      await manager.executeBestOfN(
        'user-1',
        {
          content: 'test prompt',
          threadId: 'thread-best-1',
          n: 2,
          models: undefined,
          fileIds: ['file-1'],
        },
        '',
      );

      expect(backgroundSpy).toHaveBeenCalledWith(
        'thread-best-1',
        'test prompt',
        2,
        'user-1',
        expect.anything(),
        undefined,
        undefined,
        undefined,
        '',
        ['file-1'],
      );
      backgroundSpy.mockRestore();
    });

    it('should create a new thread when no threadId provided', async () => {
      threadsRepo.create!.mockResolvedValue(mockThread);
      messagesRepo.create!.mockResolvedValue(mockUserMessage);

      const result = await manager.executeBestOfN(
        'user-1',
        {
          content: 'test prompt',
          n: 2,
          models: undefined,
        },
        '',
      );

      expect(threadsRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'user-1',
          routingMode: 'AUTO',
        }),
      );
      expect(result.threadId).toBe('thread-best-1');
    });
  });

  describe('DTO validation', () => {
    it('should accept valid dto with n=3', () => {
      const result = bestOfNMessageSchema.safeParse({ content: 'hello', n: 3 });
      expect(result.success).toBe(true);
    });

    it('should reject n < 2', () => {
      const result = bestOfNMessageSchema.safeParse({ content: 'hello', n: 1 });
      expect(result.success).toBe(false);
    });

    it('should reject n > 5', () => {
      const result = bestOfNMessageSchema.safeParse({ content: 'hello', n: 6 });
      expect(result.success).toBe(false);
    });

    it('should reject empty content', () => {
      const result = bestOfNMessageSchema.safeParse({ content: '', n: 3 });
      expect(result.success).toBe(false);
    });

    it('should default n to 3 when not provided', () => {
      const result = bestOfNMessageSchema.safeParse({ content: 'hello' });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.n).toBe(3);
      }
    });
  });

  describe('executeInBackground', () => {
    it('should store ASSISTANT message with bestOfN:true metadata', async () => {
      messagesRepo.create!.mockResolvedValue(mockAssistantMessage);

      await manager.executeInBackground('thread-best-1', 'test prompt', 2, 'user-1');

      expect(messagesRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          role: 'ASSISTANT',
          metadata: expect.objectContaining({ bestOfN: true }),
        }),
      );
    });

    it('passes the attachment list to the context gateway', async () => {
      messagesRepo.create!.mockResolvedValue(mockAssistantMessage);

      await manager.executeInBackground(
        'thread-best-1',
        'test prompt',
        2,
        'user-1',
        undefined,
        undefined,
        undefined,
        undefined,
        '',
        ['file-1'],
      );

      expect(mockChatContextGateway.build).toHaveBeenCalledWith(
        expect.objectContaining({ fileIds: ['file-1'] }),
      );
    });

    it('should store message where best candidate has rank 1', async () => {
      messagesRepo.create!.mockResolvedValue(mockAssistantMessage);

      await manager.executeInBackground('thread-best-1', 'test prompt', 2, 'user-1');

      expect(messagesRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          metadata: expect.objectContaining({ bestRank: 1 }),
        }),
      );
    });

    it('should emit SSE completion on success', async () => {
      messagesRepo.create!.mockResolvedValue(mockAssistantMessage);

      await manager.executeInBackground('thread-best-1', 'test prompt', 2, 'user-1');

      expect(streamService.emitCompletion).toHaveBeenCalledWith(
        'thread-best-1',
        'local-ollama',
        expect.any(String),
      );
    });

    it('should store error message and emit SSE error on failure', async () => {
      mockModeExecutionGateway.run.mockRejectedValue(new Error('Ollama unreachable'));
      messagesRepo.create!.mockResolvedValue(mockAssistantMessage);

      await manager.executeInBackground('thread-best-1', 'test prompt', 2, 'user-1');

      expect(streamService.emitError).toHaveBeenCalledWith('thread-best-1', expect.any(String));
    });

    it('should resolve (fire-and-forget) even if everything fails', async () => {
      mockModeExecutionGateway.run.mockRejectedValue(new Error('Fatal'));
      messagesRepo.create!.mockRejectedValue(new Error('DB down'));

      await expect(
        manager.executeInBackground('thread-best-1', 'test prompt', 2, 'user-1'),
      ).resolves.toBeUndefined();
    });

    it('stores error message with error:true metadata when all candidates fail', async () => {
      mockModeExecutionGateway.run.mockRejectedValue(new Error('Network timeout'));
      const createMock = vi.fn().mockResolvedValue({ id: 'error-msg-1' });
      const isolatedManager = new BestOfNManager(
        {
          ...messagesRepo,
          create: createMock,
        } as unknown as ChatMessagesRepository,
        threadsRepo as unknown as ChatThreadsRepository,
        streamService as unknown as ChatStreamService,
        qualityManager as unknown as QualityCheckManager,
        mockChatContextGateway as any,
        mockModeExecutionGateway as any,
        mockResearchEnricherManager as any,
      );
      await isolatedManager.executeInBackground('thread-err', 'prompt', 2, 'user-1');
      expect(createMock).toHaveBeenCalledWith(
        expect.objectContaining({ metadata: expect.objectContaining({ error: true }) }),
      );
    });

    it('stores candidates array in metadata with all n candidates', async () => {
      messagesRepo.create!.mockResolvedValue(mockAssistantMessage);
      (httpClientModule.httpRequest as Mock)
        .mockResolvedValueOnce({ ok: true, status: 200, data: { response: 'answer A' } })
        .mockResolvedValueOnce({ ok: true, status: 200, data: { response: 'answer B' } })
        .mockResolvedValueOnce({ ok: true, status: 200, data: { response: 'answer C' } });

      await manager.executeInBackground('thread-best-1', 'prompt', 3, 'user-1');

      const callCall = (messagesRepo.create as Mock).mock.calls[0];
      expect(callCall).toBeDefined();
      const call = callCall?.[0] as Record<string, unknown>;
      const meta = call['metadata'] as Record<string, unknown>;
      const candidates = meta['candidates'] as unknown[];
      expect(candidates).toHaveLength(3);
    });

    it('uses provided models array when given', async () => {
      messagesRepo.create!.mockResolvedValue(mockAssistantMessage);

      await manager.executeInBackground('thread-best-1', 'prompt', 2, 'user-1', [
        'qwen2.5-coder:7b',
        'deepseek-coder-v2:16b',
      ]);

      // The mode names its model to the shared chokepoint now, instead of
      // hand-building an Ollama request body.
      expect(mockModeExecutionGateway.run).toHaveBeenCalledWith(
        expect.objectContaining({
          model: 'qwen2.5-coder:7b',
        }),
      );
    });

    it('stores error message with { error: true } when storeErrorMessage itself fails', async () => {
      mockModeExecutionGateway.run.mockRejectedValue(new Error('Ollama down'));
      const createMock = vi
        .fn()
        .mockRejectedValueOnce(new Error('DB write 1 failed'))
        .mockRejectedValueOnce(new Error('DB write 2 failed'));
      const isolatedManager = new BestOfNManager(
        {
          ...messagesRepo,
          create: createMock,
        } as unknown as ChatMessagesRepository,
        threadsRepo as unknown as ChatThreadsRepository,
        streamService as unknown as ChatStreamService,
        qualityManager as unknown as QualityCheckManager,
        mockChatContextGateway as any,
        mockModeExecutionGateway as any,
        mockResearchEnricherManager as any,
      );
      await expect(
        isolatedManager.executeInBackground('thread-double-fail', 'prompt', 2, 'user-1'),
      ).resolves.toBeUndefined();
    });
  });

  describe('DTO boundary checks', () => {
    it('should accept content of exactly 10000 chars', () => {
      const result = bestOfNMessageSchema.safeParse({ content: 'a'.repeat(10_000), n: 3 });
      expect(result.success).toBe(true);
    });

    it('should reject content exceeding 10000 chars', () => {
      const result = bestOfNMessageSchema.safeParse({ content: 'a'.repeat(10_001), n: 3 });
      expect(result.success).toBe(false);
    });

    it('should reject models array with more than 5 entries', () => {
      const result = bestOfNMessageSchema.safeParse({
        content: 'test',
        n: 2,
        models: ['a', 'b', 'c', 'd', 'e', 'f'],
      });
      expect(result.success).toBe(false);
    });

    it('should accept n=2 (minimum valid)', () => {
      const result = bestOfNMessageSchema.safeParse({ content: 'hello', n: 2 });
      expect(result.success).toBe(true);
    });

    it('should accept n=5 (maximum valid)', () => {
      const result = bestOfNMessageSchema.safeParse({ content: 'hello', n: 5 });
      expect(result.success).toBe(true);
    });
  });

  describe('model selection', () => {
    it('rejects manual selection with unsupported provider before queuing', async () => {
      const selectionService: Partial<Record<keyof AdvancedModuleModelSelectionService, Mock>> = {
        resolveSelection: vi
          .fn()
          .mockRejectedValue(
            new BusinessException(
              'unsupported provider',
              'ADVANCED_MODULE_MODEL_PROVIDER_UNSUPPORTED',
            ),
          ),
      };
      const isolated = new BestOfNManager(
        messagesRepo as unknown as ChatMessagesRepository,
        threadsRepo as unknown as ChatThreadsRepository,
        streamService as unknown as ChatStreamService,
        qualityManager as unknown as QualityCheckManager,
        mockChatContextGateway as any,
        mockModeExecutionGateway as any,
        mockResearchEnricherManager as any,
        selectionService as unknown as AdvancedModuleModelSelectionService,
      );

      await expect(
        isolated.executeBestOfN(
          'user-1',
          {
            content: 'test prompt',
            threadId: 'thread-best-1',
            n: 3,
            models: undefined,
            requestedProvider: 'OPENAI',
            requestedModel: 'gpt-4.1',
            modelSelectionMode: ModelSelectionMode.MANUAL_MODEL,
          },
          '',
        ),
      ).rejects.toThrow('unsupported provider');
      expect(messagesRepo.create).not.toHaveBeenCalled();
    });

    it('persists modelSelection metadata with resolved model for MANUAL_MODEL', async () => {
      const manualResolution: AdvancedModelSelectionResolution = {
        modelSelectionMode: ModelSelectionMode.MANUAL_MODEL,
        requestedProvider: 'local-ollama',
        requestedModel: 'qwen2.5:7b',
        requestedDisplayName: 'qwen2.5:7b',
        selectedModelSource: 'LOCAL',
        actualProvider: 'local-ollama',
        actualModel: 'qwen2.5:7b',
      };
      messagesRepo.create!.mockResolvedValue(mockAssistantMessage);

      await (
        manager as unknown as {
          executeInBackground: (
            threadId: string,
            content: string,
            n: number,
            userId: string,
            selection: AdvancedModelSelectionResolution,
            models?: string[],
          ) => Promise<void>;
        }
      ).executeInBackground('thread-best-1', 'test prompt', 2, 'user-1', manualResolution);

      const assistantCall = messagesRepo.create!.mock.calls.find(
        (call) => (call[0] as { role?: string }).role === 'ASSISTANT',
      );
      expect(assistantCall).toBeDefined();
      const metadata = (
        assistantCall![0] as {
          metadata?: { modelSelection?: AdvancedModelSelectionResolution };
        }
      ).metadata;
      expect(metadata?.modelSelection?.modelSelectionMode).toBe(ModelSelectionMode.MANUAL_MODEL);
      expect(metadata?.modelSelection?.actualModel).toBe('qwen2.5:7b');
    });

    it('AUTO path: all N candidates run with the resolved fallback model', async () => {
      const autoResolution: AdvancedModelSelectionResolution = {
        modelSelectionMode: ModelSelectionMode.AUTO,
        requestedProvider: null,
        requestedModel: null,
        requestedDisplayName: null,
        selectedModelSource: null,
        actualProvider: 'local-ollama',
        actualModel: 'gemma3:4b',
      };
      messagesRepo.create!.mockResolvedValue(mockAssistantMessage);

      await (
        manager as unknown as {
          executeInBackground: (
            threadId: string,
            content: string,
            n: number,
            userId: string,
            selection: AdvancedModelSelectionResolution,
            models?: string[],
          ) => Promise<void>;
        }
      ).executeInBackground('thread-best-1', 'test prompt', 3, 'user-1', autoResolution);

      const assistantCall = messagesRepo.create!.mock.calls.find(
        (call) => (call[0] as { role?: string }).role === 'ASSISTANT',
      );
      const metadata = (
        assistantCall![0] as {
          metadata?: { modelSelection?: AdvancedModelSelectionResolution };
        }
      ).metadata;
      expect(metadata?.modelSelection?.modelSelectionMode).toBe(ModelSelectionMode.AUTO);
      expect(metadata?.modelSelection?.actualModel).toBe('gemma3:4b');
    });
  });
});
