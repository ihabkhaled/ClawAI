import { type Mock, vi } from 'vitest';
import { ModelSelectionMode } from '../common/enums/model-selection-mode.enum';
import { BusinessException } from '../common/errors/business.exception';
import { VerifierManager } from '../modules/chat-messages/managers/verifier.manager';
import { type ChatMessagesRepository } from '../modules/chat-messages/repositories/chat-messages.repository';
import { type ChatThreadsRepository } from '../modules/chat-threads/repositories/chat-threads.repository';
import { type ChatStreamService } from '../modules/chat-messages/services/chat-stream.service';
import { type AdvancedModuleModelSelectionService } from '../modules/chat-messages/services/advanced-module-model-selection.service';
import { verifyMessageSchema } from '../modules/chat-messages/dto/verify-message.dto';
import type { AdvancedModelSelectionResolution } from '../modules/chat-messages/types/advanced-model-selection.types';

vi.mock('../modules/chat-messages/managers/verifier.manager', async () => {
  const actual = await vi.importActual<{ VerifierManager: typeof VerifierManager }>(
    '../modules/chat-messages/managers/verifier.manager',
  );
  return actual;
});

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

const verifierJsonResponse = JSON.stringify({
  score: 0.9,
  issues: [],
  suggestions: [],
});

// Universal-research PR2: research-enricher dependency stub.
const mockResearchEnricherManager = {
  enrichForOrchestration: vi.fn().mockResolvedValue({ transcript: null, systemPrompt: '' }),
};

const emptyBundle = () => ({
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
  thread: { id: 'thread-verify-1' },
  threadSettings: undefined,
  messages: [],
  fileIds: [],
  latestUserMetadata: null,
});

// One bundle, built once and shared by the draft, the judge and every repair.
const mockChatContextGateway = {
  build: vi.fn(async () => emptyBundle()),
};

// Draft, verify and repair all go through the same chokepoint a chat turn
// uses, so the spec drives them here instead of through a hand-built Ollama
// request body. First call is the draft, every call after it is the judge.
const mockModeExecutionGateway = {
  run: vi.fn(async () => ({ content: 'mocked draft response' })),
};

describe('VerifierManager', () => {
  let manager: VerifierManager;
  let messagesRepo: ReturnType<typeof mockMessagesRepository>;
  let threadsRepo: ReturnType<typeof mockThreadsRepository>;
  let streamService: ReturnType<typeof mockStreamService>;

  beforeEach(() => {
    messagesRepo = mockMessagesRepository();
    threadsRepo = mockThreadsRepository();
    streamService = mockStreamService();
    mockResearchEnricherManager.enrichForOrchestration.mockResolvedValue({
      transcript: null,
      systemPrompt: '',
    });

    manager = new VerifierManager(
      messagesRepo as unknown as ChatMessagesRepository,
      threadsRepo as unknown as ChatThreadsRepository,
      streamService as unknown as ChatStreamService,
      mockChatContextGateway as any,
      mockModeExecutionGateway as any,
      mockResearchEnricherManager as any,
    );

    vi.clearAllMocks();
    mockChatContextGateway.build.mockResolvedValue(emptyBundle());
    mockModeExecutionGateway.run
      .mockResolvedValueOnce({ content: 'mocked draft response' })
      .mockResolvedValue({ content: verifierJsonResponse });
  });

  describe('executeVerify', () => {
    it('should return messageId and threadId', async () => {
      messagesRepo.create!.mockResolvedValue(mockUserMessage);

      const result = await manager.executeVerify(
        'user-1',
        {
          content: 'test prompt',
          threadId: 'thread-verify-1',
          maxRevisions: 1,
        },
        '',
      );

      expect(result).toHaveProperty('messageId');
      expect(result).toHaveProperty('threadId', 'thread-verify-1');
    });

    it('should create a new thread when no threadId provided', async () => {
      threadsRepo.create!.mockResolvedValue(mockThread);
      messagesRepo.create!.mockResolvedValue(mockUserMessage);

      const result = await manager.executeVerify(
        'user-1',
        {
          content: 'test prompt',
          maxRevisions: 1,
        },
        '',
      );

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

      await manager.executeInBackground('thread-verify-1', 'test prompt', 1, 'user-1');

      expect(messagesRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          role: 'ASSISTANT',
          metadata: expect.objectContaining({ verified: true }),
        }),
      );
    });

    it('should store ASSISTANT with verifierScore in metadata', async () => {
      messagesRepo.create!.mockResolvedValue(mockAssistantMessage);

      await manager.executeInBackground('thread-verify-1', 'test prompt', 1, 'user-1');

      expect(messagesRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          metadata: expect.objectContaining({ verifierScore: expect.any(Number) }),
        }),
      );
    });

    it('should emit SSE completion on success', async () => {
      messagesRepo.create!.mockResolvedValue(mockAssistantMessage);

      await manager.executeInBackground('thread-verify-1', 'test prompt', 1, 'user-1');

      expect(streamService.emitCompletion).toHaveBeenCalledWith(
        'thread-verify-1',
        'local-ollama',
        expect.any(String),
      );
    });

    it('should emit SSE error and store error message when draft generation fails', async () => {
      mockModeExecutionGateway.run.mockReset();
      mockModeExecutionGateway.run.mockRejectedValue(new Error('Ollama unreachable'));
      messagesRepo.create!.mockResolvedValue(mockAssistantMessage);

      await manager.executeInBackground('thread-verify-1', 'test prompt', 1, 'user-1');

      expect(streamService.emitError).toHaveBeenCalledWith('thread-verify-1', expect.any(String));
      expect(messagesRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({ metadata: expect.objectContaining({ error: true }) }),
      );
    });

    it('passes the attachment list to the context gateway', async () => {
      messagesRepo.create!.mockResolvedValue(mockAssistantMessage);

      await manager.executeInBackground(
        'thread-verify-1',
        'test prompt',
        0,
        'user-1',
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

    it('builds ONE bundle and gives the verify pass the same one the draft saw', async () => {
      messagesRepo.create!.mockResolvedValue(mockAssistantMessage);

      await manager.executeInBackground('thread-verify-1', 'test prompt', 0, 'user-1');

      expect(mockChatContextGateway.build).toHaveBeenCalledTimes(1);
      expect(mockChatContextGateway.build).toHaveBeenCalledWith(
        expect.objectContaining({ surface: 'VERIFY', threadId: 'thread-verify-1' }),
      );
      const runCalls = (mockModeExecutionGateway.run as Mock).mock.calls as Array<
        [Record<string, unknown>]
      >;
      const draftRequest = runCalls[0]?.[0];
      const verifyRequest = runCalls[1]?.[0];
      expect(draftRequest).toBeDefined();
      expect(verifyRequest).toBeDefined();
      // The defect this replaces: the verifier used to judge an answer with no
      // sight of the conversation that produced it.
      expect(verifyRequest?.['bundle']).toBe(draftRequest?.['bundle']);
      expect(String(verifyRequest?.['prompt'])).toContain('You are a response quality verifier');
      expect(verifyRequest?.['ledgerContext']).toBe('VERIFY');
    });

    it('should resolve (fire-and-forget) even when everything fails', async () => {
      mockModeExecutionGateway.run.mockReset();
      mockModeExecutionGateway.run.mockRejectedValue(new Error('Fatal'));
      messagesRepo.create!.mockRejectedValue(new Error('DB down'));

      await expect(
        manager.executeInBackground('thread-verify-1', 'test prompt', 1, 'user-1'),
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
      const isolated = new VerifierManager(
        messagesRepo as unknown as ChatMessagesRepository,
        threadsRepo as unknown as ChatThreadsRepository,
        streamService as unknown as ChatStreamService,
        mockChatContextGateway as any,
        mockModeExecutionGateway as any,
        mockResearchEnricherManager as any,
        selectionService as unknown as AdvancedModuleModelSelectionService,
      );

      await expect(
        isolated.executeVerify(
          'user-1',
          {
            content: 'please verify this answer',
            threadId: 'thread-verify-1',
            maxRevisions: 1,
            requestedProvider: 'OPENAI',
            requestedModel: 'gpt-4.1',
            modelSelectionMode: ModelSelectionMode.MANUAL_MODEL,
          },
          '',
        ),
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
            userId: string,
            selection: AdvancedModelSelectionResolution,
          ) => Promise<void>;
        }
      ).executeInBackground('thread-verify-1', 'please verify', 0, 'user-1', manualResolution);

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
            userId: string,
            selection: AdvancedModelSelectionResolution,
          ) => Promise<void>;
        }
      ).executeInBackground('thread-verify-1', 'please verify', 0, 'user-1', autoResolution);

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
