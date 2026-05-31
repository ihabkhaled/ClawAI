import { ModelSelectionMode } from '../common/enums/model-selection-mode.enum';
import { BusinessException } from '../common/errors/business.exception';
import { CostEnsembleManager } from '../modules/chat-messages/managers/cost-ensemble.manager';
import { type ChatMessagesRepository } from '../modules/chat-messages/repositories/chat-messages.repository';
import { type ChatThreadsRepository } from '../modules/chat-threads/repositories/chat-threads.repository';
import { type ChatStreamService } from '../modules/chat-messages/services/chat-stream.service';
import { type QualityCheckManager } from '../modules/chat-messages/managers/quality-check.manager';
import { type AdvancedModuleModelSelectionService } from '../modules/chat-messages/services/advanced-module-model-selection.service';
import { costEnsembleMessageSchema } from '../modules/chat-messages/dto/cost-ensemble-message.dto';
import * as httpClientModule from '../common/utilities/http-client.utility';
import type { AdvancedModelSelectionResolution } from '../modules/chat-messages/types/advanced-model-selection.types';

jest.mock('../app/config/app.config', () => ({
  AppConfig: {
    get: jest.fn().mockReturnValue({
      OLLAMA_SERVICE_URL: 'http://localhost:11434',
    }),
  },
}));

jest.mock('../common/utilities/http-client.utility', () => ({
  httpRequest: jest.fn().mockResolvedValue({
    ok: true,
    status: 200,
    data: {
      response: JSON.stringify({
        complexity: 0.3,
        risk: 0.2,
        ambiguity: 0.2,
        reasoning: 'Simple task',
      }),
    },
  }),
}));

const mockThread = {
  id: 'thread-ce-1',
  userId: 'user-1',
  title: 'Cost Ensemble: test',
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
  id: 'msg-user-ce-1',
  threadId: 'thread-ce-1',
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
  id: 'msg-assistant-ce-1',
  threadId: 'thread-ce-1',
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
  metadata: { costEnsemble: true, tier: 'single', candidates: [], selectedIndex: 0 },
  createdAt: new Date(),
};

const makeMessagesRepo = (): Partial<Record<keyof ChatMessagesRepository, jest.Mock>> => ({
  create: jest.fn(),
});

const makeThreadsRepo = (): Partial<Record<keyof ChatThreadsRepository, jest.Mock>> => ({
  create: jest.fn(),
  findById: jest.fn(),
});

const makeStreamService = (): Partial<Record<keyof ChatStreamService, jest.Mock>> => ({
  emitCompletion: jest.fn(),
  emitError: jest.fn(),
});

const makeQualityManager = (): Partial<Record<keyof QualityCheckManager, jest.Mock>> => ({
  checkResponseQuality: jest.fn().mockReturnValue({ score: 0.8, reasons: [], isWeak: false }),
});

// Universal-research PR2: research-enricher dependency.
const mockResearchEnricherManager = {
  enrichForOrchestration: jest.fn().mockResolvedValue({ transcript: null, systemPrompt: '' }),
};

describe('CostEnsembleManager', () => {
  let manager: CostEnsembleManager;
  let messagesRepo: ReturnType<typeof makeMessagesRepo>;
  let threadsRepo: ReturnType<typeof makeThreadsRepo>;
  let streamService: ReturnType<typeof makeStreamService>;
  let qualityManager: ReturnType<typeof makeQualityManager>;

  beforeEach(() => {
    messagesRepo = makeMessagesRepo();
    threadsRepo = makeThreadsRepo();
    streamService = makeStreamService();
    qualityManager = makeQualityManager();
    mockResearchEnricherManager.enrichForOrchestration.mockResolvedValue({
      transcript: null,
      systemPrompt: '',
    });

    manager = new CostEnsembleManager(
      messagesRepo as unknown as ChatMessagesRepository,
      threadsRepo as unknown as ChatThreadsRepository,
      streamService as unknown as ChatStreamService,
      qualityManager as unknown as QualityCheckManager,
      mockResearchEnricherManager as any,
    );

    jest.clearAllMocks();

    (httpClientModule.httpRequest as jest.Mock).mockResolvedValue({
      ok: true,
      status: 200,
      data: {
        response: JSON.stringify({
          complexity: 0.3,
          risk: 0.2,
          ambiguity: 0.2,
          reasoning: 'Simple task',
        }),
      },
    });
  });

  describe('executeCostEnsemble', () => {
    it('should return messageId and threadId', async () => {
      messagesRepo.create!.mockResolvedValue(mockUserMessage);

      const result = await manager.executeCostEnsemble(
        'user-1',
        {
          content: 'test prompt',
          threadId: 'thread-ce-1',
        },
        '',
      );

      expect(result).toHaveProperty('messageId');
      expect(result).toHaveProperty('threadId', 'thread-ce-1');
    });

    it('should create a new thread when no threadId provided', async () => {
      threadsRepo.create!.mockResolvedValue(mockThread);
      messagesRepo.create!.mockResolvedValue(mockUserMessage);

      const result = await manager.executeCostEnsemble(
        'user-1',
        {
          content: 'test prompt',
        },
        '',
      );

      expect(threadsRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'user-1',
          routingMode: 'AUTO',
        }),
      );
      expect(result.threadId).toBe('thread-ce-1');
    });
  });

  describe('executeInBackground', () => {
    it('should store ASSISTANT message with costEnsemble:true metadata', async () => {
      messagesRepo.create!.mockResolvedValue(mockAssistantMessage);
      (httpClientModule.httpRequest as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          data: {
            response: JSON.stringify({
              complexity: 0.3,
              risk: 0.2,
              ambiguity: 0.2,
              reasoning: 'Simple',
            }),
          },
        })
        .mockResolvedValue({
          ok: true,
          status: 200,
          data: { response: 'candidate answer' },
        });

      await manager.executeInBackground('thread-ce-1', 'test prompt');

      expect(messagesRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          role: 'ASSISTANT',
          metadata: expect.objectContaining({ costEnsemble: true }),
        }),
      );
    });

    it('should store tier in metadata based on classification score', async () => {
      messagesRepo.create!.mockResolvedValue(mockAssistantMessage);
      (httpClientModule.httpRequest as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          data: {
            response: JSON.stringify({
              complexity: 0.9,
              risk: 0.9,
              ambiguity: 0.9,
              reasoning: 'Very complex',
            }),
          },
        })
        .mockResolvedValue({
          ok: true,
          status: 200,
          data: { response: 'some answer' },
        });

      await manager.executeInBackground('thread-ce-1', 'complex task');

      const callArg = (messagesRepo.create as jest.Mock).mock.calls[0][0] as Record<
        string,
        unknown
      >;
      const meta = callArg['metadata'] as Record<string, unknown>;
      expect(meta['tier']).toBe('trio');
    });

    it('should emit SSE completion on success', async () => {
      messagesRepo.create!.mockResolvedValue(mockAssistantMessage);
      (httpClientModule.httpRequest as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          data: {
            response: JSON.stringify({
              complexity: 0.3,
              risk: 0.2,
              ambiguity: 0.2,
              reasoning: 'Fine',
            }),
          },
        })
        .mockResolvedValue({
          ok: true,
          status: 200,
          data: { response: 'answer' },
        });

      await manager.executeInBackground('thread-ce-1', 'test prompt');

      expect(streamService.emitCompletion).toHaveBeenCalledWith(
        'thread-ce-1',
        'local-ollama',
        expect.any(String),
      );
    });

    it('should emit SSE error and store error when Ollama fails', async () => {
      (httpClientModule.httpRequest as jest.Mock).mockRejectedValue(new Error('Ollama down'));
      messagesRepo.create!.mockResolvedValue(mockAssistantMessage);

      await manager.executeInBackground('thread-ce-1', 'test prompt');

      expect(streamService.emitError).toHaveBeenCalledWith('thread-ce-1', expect.any(String));
      expect(messagesRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          metadata: expect.objectContaining({ error: true }),
        }),
      );
    });

    it('should resolve (fire-and-forget) even when everything fails', async () => {
      (httpClientModule.httpRequest as jest.Mock).mockRejectedValue(new Error('Fatal'));
      messagesRepo.create!.mockRejectedValue(new Error('DB down'));

      await expect(
        manager.executeInBackground('thread-ce-1', 'test prompt'),
      ).resolves.toBeUndefined();
    });

    it('should not throw when storeErrorMessage itself fails (nested try-catch)', async () => {
      (httpClientModule.httpRequest as jest.Mock).mockRejectedValue(new Error('Ollama down'));
      messagesRepo.create!.mockRejectedValue(new Error('DB also down'));

      await expect(
        manager.executeInBackground('thread-store-fail', 'prompt'),
      ).resolves.toBeUndefined();
    });
  });

  describe('DTO validation', () => {
    it('should accept valid content', () => {
      const result = costEnsembleMessageSchema.safeParse({ content: 'hello' });
      expect(result.success).toBe(true);
    });

    it('should reject empty content', () => {
      const result = costEnsembleMessageSchema.safeParse({ content: '' });
      expect(result.success).toBe(false);
    });

    it('should reject content longer than 10000 chars', () => {
      const result = costEnsembleMessageSchema.safeParse({ content: 'x'.repeat(10_001) });
      expect(result.success).toBe(false);
    });

    it('should accept content of exactly 10000 chars', () => {
      const result = costEnsembleMessageSchema.safeParse({ content: 'x'.repeat(10_000) });
      expect(result.success).toBe(true);
    });

    it('should accept optional threadId', () => {
      const result = costEnsembleMessageSchema.safeParse({
        content: 'hello',
        threadId: 'abc-123',
      });
      expect(result.success).toBe(true);
    });
  });

  describe('model selection', () => {
    it('rejects manual selection with unsupported provider before queuing', async () => {
      const selectionService: Partial<
        Record<keyof AdvancedModuleModelSelectionService, jest.Mock>
      > = {
        resolveSelection: jest
          .fn()
          .mockRejectedValue(
            new BusinessException(
              'unsupported provider',
              'ADVANCED_MODULE_MODEL_PROVIDER_UNSUPPORTED',
            ),
          ),
      };
      const isolated = new CostEnsembleManager(
        messagesRepo as unknown as ChatMessagesRepository,
        threadsRepo as unknown as ChatThreadsRepository,
        streamService as unknown as ChatStreamService,
        qualityManager as unknown as QualityCheckManager,
        mockResearchEnricherManager as any,
        selectionService as unknown as AdvancedModuleModelSelectionService,
      );

      await expect(
        isolated.executeCostEnsemble(
          'user-1',
          {
            content: 'please ensemble this',
            threadId: 'thread-ce-1',
            requestedProvider: 'OPENAI',
            requestedModel: 'gpt-4.1',
            modelSelectionMode: ModelSelectionMode.MANUAL_MODEL,
          },
          '',
        ),
      ).rejects.toThrow('unsupported provider');
      expect(messagesRepo.create).not.toHaveBeenCalled();
    });

    it('MANUAL_MODEL: ensemble anchors on the chosen model and stores truthful routeRoadmap', async () => {
      const manualResolution: AdvancedModelSelectionResolution = {
        modelSelectionMode: ModelSelectionMode.MANUAL_MODEL,
        requestedProvider: 'local-ollama',
        requestedModel: 'qwen2.5:7b',
        requestedDisplayName: 'qwen2.5:7b',
        selectedModelSource: 'LOCAL',
        actualProvider: 'local-ollama',
        actualModel: 'qwen2.5:7b',
      };
      messagesRepo.create!.mockResolvedValue({ id: 'ce-msg', threadId: 'thread-ce-1' });

      await (
        manager as unknown as {
          executeInBackground: (
            threadId: string,
            content: string,
            selection: AdvancedModelSelectionResolution,
          ) => Promise<void>;
        }
      ).executeInBackground('thread-ce-1', 'please ensemble this', manualResolution);

      const assistantCall = messagesRepo.create!.mock.calls.find(
        (call) => (call[0] as { role?: string }).role === 'ASSISTANT',
      );
      expect(assistantCall).toBeDefined();
      const metadata = (
        assistantCall![0] as {
          metadata?: {
            modelSelection?: AdvancedModelSelectionResolution;
            routeRoadmap?: { finalProvider?: string; finalModel?: string; steps?: unknown[] };
          };
        }
      ).metadata;
      expect(metadata?.modelSelection?.modelSelectionMode).toBe(ModelSelectionMode.MANUAL_MODEL);
      expect(metadata?.modelSelection?.actualModel).toBe('qwen2.5:7b');
      expect(metadata?.routeRoadmap?.finalProvider).toBe('local-ollama');
      expect(metadata?.routeRoadmap?.finalModel).toBe('qwen2.5:7b');
      expect(Array.isArray(metadata?.routeRoadmap?.steps)).toBe(true);
    });

    it('AUTO path: routeRoadmap surfaces the truthfully-resolved model', async () => {
      const autoResolution: AdvancedModelSelectionResolution = {
        modelSelectionMode: ModelSelectionMode.AUTO,
        requestedProvider: null,
        requestedModel: null,
        requestedDisplayName: null,
        selectedModelSource: null,
        actualProvider: 'local-ollama',
        actualModel: 'gemma3:4b',
      };
      messagesRepo.create!.mockResolvedValue({ id: 'ce-auto', threadId: 'thread-ce-1' });

      await (
        manager as unknown as {
          executeInBackground: (
            threadId: string,
            content: string,
            selection: AdvancedModelSelectionResolution,
          ) => Promise<void>;
        }
      ).executeInBackground('thread-ce-1', 'please ensemble auto', autoResolution);

      const assistantCall = messagesRepo.create!.mock.calls.find(
        (call) => (call[0] as { role?: string }).role === 'ASSISTANT',
      );
      const metadata = (
        assistantCall![0] as {
          metadata?: {
            modelSelection?: AdvancedModelSelectionResolution;
            routeRoadmap?: { finalProvider?: string; finalModel?: string };
          };
        }
      ).metadata;
      expect(metadata?.modelSelection?.modelSelectionMode).toBe(ModelSelectionMode.AUTO);
      expect(metadata?.routeRoadmap?.finalProvider).toBe('local-ollama');
      expect(metadata?.routeRoadmap?.finalModel).toBe('gemma3:4b');
    });
  });
});
