import { ModelSelectionMode } from '../common/enums/model-selection-mode.enum';
import { BusinessException } from '../common/errors/business.exception';
import { VerifierManager } from '../modules/chat-messages/managers/verifier.manager';
import { type ChatMessagesRepository } from '../modules/chat-messages/repositories/chat-messages.repository';
import { type ChatThreadsRepository } from '../modules/chat-threads/repositories/chat-threads.repository';
import { type ChatStreamService } from '../modules/chat-messages/services/chat-stream.service';
import { type AdvancedModuleModelSelectionService } from '../modules/chat-messages/services/advanced-module-model-selection.service';
import { verifyMessageSchema } from '../modules/chat-messages/dto/verify-message.dto';
import * as httpClientModule from '../common/utilities/http-client.utility';
import type { AdvancedModelSelectionResolution } from '../modules/chat-messages/types/advanced-model-selection.types';

jest.mock('../modules/chat-messages/managers/verifier.manager', () => {
  const actual = jest.requireActual<{ VerifierManager: typeof VerifierManager }>(
    '../modules/chat-messages/managers/verifier.manager',
  );
  return actual;
});

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
    data: { response: 'mocked draft response' },
  }),
}));

const mockThread = {
  id: 'thread-verify-1',
  userId: 'user-1',
  title: 'Verify: test',
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
  id: 'msg-user-verify-1',
  threadId: 'thread-verify-1',
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
  id: 'msg-assistant-verify-1',
  threadId: 'thread-verify-1',
  role: 'ASSISTANT' as const,
  content: 'verified response',
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
  metadata: { verified: true, verifierScore: 0.9, verifierIssues: [], revisionCount: 0 },
  createdAt: new Date(),
};

const mockMessagesRepository = (): Partial<Record<keyof ChatMessagesRepository, jest.Mock>> => ({
  create: jest.fn(),
});

const mockThreadsRepository = (): Partial<Record<keyof ChatThreadsRepository, jest.Mock>> => ({
  create: jest.fn(),
  findById: jest.fn(),
});

const mockStreamService = (): Partial<Record<keyof ChatStreamService, jest.Mock>> => ({
  emitCompletion: jest.fn(),
  emitError: jest.fn(),
});

const verifierJsonResponse = JSON.stringify({
  score: 0.9,
  issues: [],
  suggestions: [],
});

describe('VerifierManager', () => {
  let manager: VerifierManager;
  let messagesRepo: ReturnType<typeof mockMessagesRepository>;
  let threadsRepo: ReturnType<typeof mockThreadsRepository>;
  let streamService: ReturnType<typeof mockStreamService>;

  beforeEach(() => {
    messagesRepo = mockMessagesRepository();
    threadsRepo = mockThreadsRepository();
    streamService = mockStreamService();

    manager = new VerifierManager(
      messagesRepo as unknown as ChatMessagesRepository,
      threadsRepo as unknown as ChatThreadsRepository,
      streamService as unknown as ChatStreamService,
    );

    jest.clearAllMocks();
    (httpClientModule.httpRequest as jest.Mock)
      .mockResolvedValueOnce({ ok: true, status: 200, data: { response: 'mocked draft response' } })
      .mockResolvedValue({ ok: true, status: 200, data: { response: verifierJsonResponse } });
  });

  describe('executeVerify', () => {
    it('should return messageId and threadId', async () => {
      messagesRepo.create!.mockResolvedValue(mockUserMessage);

      const result = await manager.executeVerify('user-1', {
        content: 'test prompt',
        threadId: 'thread-verify-1',
        maxRevisions: 1,
      });

      expect(result).toHaveProperty('messageId');
      expect(result).toHaveProperty('threadId', 'thread-verify-1');
    });

    it('should create a new thread when no threadId provided', async () => {
      threadsRepo.create!.mockResolvedValue(mockThread);
      messagesRepo.create!.mockResolvedValue(mockUserMessage);

      const result = await manager.executeVerify('user-1', {
        content: 'test prompt',
        maxRevisions: 1,
      });

      expect(threadsRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'user-1',
          routingMode: 'AUTO',
        }),
      );
      expect(result.threadId).toBe('thread-verify-1');
    });
  });

  describe('executeInBackground', () => {
    it('should store ASSISTANT with verified:true metadata', async () => {
      messagesRepo.create!.mockResolvedValue(mockAssistantMessage);

      await manager.executeInBackground('thread-verify-1', 'test prompt', 1);

      expect(messagesRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          role: 'ASSISTANT',
          metadata: expect.objectContaining({ verified: true }),
        }),
      );
    });

    it('should store ASSISTANT with verifierScore in metadata', async () => {
      messagesRepo.create!.mockResolvedValue(mockAssistantMessage);

      await manager.executeInBackground('thread-verify-1', 'test prompt', 1);

      expect(messagesRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          metadata: expect.objectContaining({ verifierScore: expect.any(Number) }),
        }),
      );
    });

    it('should emit SSE completion on success', async () => {
      messagesRepo.create!.mockResolvedValue(mockAssistantMessage);

      await manager.executeInBackground('thread-verify-1', 'test prompt', 1);

      expect(streamService.emitCompletion).toHaveBeenCalledWith(
        'thread-verify-1',
        'local-ollama',
        expect.any(String),
      );
    });

    it('should emit SSE error and store error message when draft generation fails', async () => {
      (httpClientModule.httpRequest as jest.Mock).mockRejectedValue(
        new Error('Ollama unreachable'),
      );
      messagesRepo.create!.mockResolvedValue(mockAssistantMessage);

      await manager.executeInBackground('thread-verify-1', 'test prompt', 1);

      expect(streamService.emitError).toHaveBeenCalledWith('thread-verify-1', expect.any(String));
      expect(messagesRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({ metadata: expect.objectContaining({ error: true }) }),
      );
    });

    it('should resolve (fire-and-forget) even when everything fails', async () => {
      (httpClientModule.httpRequest as jest.Mock).mockRejectedValue(new Error('Fatal'));
      messagesRepo.create!.mockRejectedValue(new Error('DB down'));

      await expect(
        manager.executeInBackground('thread-verify-1', 'test prompt', 1),
      ).resolves.toBeUndefined();
    });
  });

  describe('DTO validation', () => {
    it('should accept valid dto', () => {
      const result = verifyMessageSchema.safeParse({ content: 'hello', maxRevisions: 1 });
      expect(result.success).toBe(true);
    });

    it('should reject empty content', () => {
      const result = verifyMessageSchema.safeParse({ content: '', maxRevisions: 1 });
      expect(result.success).toBe(false);
    });

    it('should reject maxRevisions > 3', () => {
      const result = verifyMessageSchema.safeParse({ content: 'hello', maxRevisions: 4 });
      expect(result.success).toBe(false);
    });

    it('should default maxRevisions to 1', () => {
      const result = verifyMessageSchema.safeParse({ content: 'hello' });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.maxRevisions).toBe(1);
      }
    });

    it('should accept maxRevisions = 0', () => {
      const result = verifyMessageSchema.safeParse({ content: 'hello', maxRevisions: 0 });
      expect(result.success).toBe(true);
    });

    it('should accept maxRevisions = 3', () => {
      const result = verifyMessageSchema.safeParse({ content: 'hello', maxRevisions: 3 });
      expect(result.success).toBe(true);
    });

    it('should accept optional threadId', () => {
      const result = verifyMessageSchema.safeParse({
        content: 'hello',
        threadId: 'thread-abc',
        maxRevisions: 1,
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
      const isolated = new VerifierManager(
        messagesRepo as unknown as ChatMessagesRepository,
        threadsRepo as unknown as ChatThreadsRepository,
        streamService as unknown as ChatStreamService,
        selectionService as unknown as AdvancedModuleModelSelectionService,
      );

      await expect(
        isolated.executeVerify('user-1', {
          content: 'please verify this answer',
          threadId: 'thread-verify-1',
          maxRevisions: 1,
          requestedProvider: 'OPENAI',
          requestedModel: 'gpt-4.1',
          modelSelectionMode: ModelSelectionMode.MANUAL_MODEL,
        }),
      ).rejects.toThrow('unsupported provider');
      expect(messagesRepo.create).not.toHaveBeenCalled();
    });

    it('persists modelSelection metadata for MANUAL_MODEL verify execution', async () => {
      const manualResolution: AdvancedModelSelectionResolution = {
        modelSelectionMode: ModelSelectionMode.MANUAL_MODEL,
        requestedProvider: 'local-ollama',
        requestedModel: 'qwen2.5:7b',
        requestedDisplayName: 'qwen2.5:7b',
        selectedModelSource: 'LOCAL',
        actualProvider: 'local-ollama',
        actualModel: 'qwen2.5:7b',
      };
      messagesRepo.create!.mockResolvedValue(mockUserMessage);

      await (
        manager as unknown as {
          executeInBackground: (
            threadId: string,
            content: string,
            maxRevisions: number,
            selection: AdvancedModelSelectionResolution,
          ) => Promise<void>;
        }
      ).executeInBackground('thread-verify-1', 'please verify', 0, manualResolution);

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

    it('AUTO path persists the resolved fallback model in metadata', async () => {
      const autoResolution: AdvancedModelSelectionResolution = {
        modelSelectionMode: ModelSelectionMode.AUTO,
        requestedProvider: null,
        requestedModel: null,
        requestedDisplayName: null,
        selectedModelSource: null,
        actualProvider: 'local-ollama',
        actualModel: 'gemma3:4b',
      };
      messagesRepo.create!.mockResolvedValue(mockUserMessage);

      await (
        manager as unknown as {
          executeInBackground: (
            threadId: string,
            content: string,
            maxRevisions: number,
            selection: AdvancedModelSelectionResolution,
          ) => Promise<void>;
        }
      ).executeInBackground('thread-verify-1', 'please verify', 0, autoResolution);

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
