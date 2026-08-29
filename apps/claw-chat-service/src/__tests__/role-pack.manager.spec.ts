import { ModelSelectionMode } from '../common/enums/model-selection-mode.enum';
import { BusinessException } from '../common/errors/business.exception';
import { RolePackManager } from '../modules/chat-messages/managers/role-pack.manager';
import { type ChatMessagesRepository } from '../modules/chat-messages/repositories/chat-messages.repository';
import { type ChatThreadsRepository } from '../modules/chat-threads/repositories/chat-threads.repository';
import { type ChatStreamService } from '../modules/chat-messages/services/chat-stream.service';
import { type AdvancedModuleModelSelectionService } from '../modules/chat-messages/services/advanced-module-model-selection.service';
import { rolePackMessageSchema } from '../modules/chat-messages/dto/role-pack-message.dto';
import * as httpClientModule from '../common/utilities/http-client.utility';
import type { AdvancedModelSelectionResolution } from '../modules/chat-messages/types/advanced-model-selection.types';
import { createFakePaygAccessControl } from '../modules/chat-messages/__tests__/helpers/fake-payg-access-control.helper';

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
    data: { response: 'mocked role output' },
  }),
}));

const mockThread = {
  id: 'thread-role-1',
  userId: 'user-1',
  title: 'Role Pack [coding-team]: test',
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
  id: 'msg-user-rp-1',
  threadId: 'thread-role-1',
  role: 'USER' as const,
  content: 'implement a login form',
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
  id: 'msg-assistant-rp-1',
  threadId: 'thread-role-1',
  role: 'ASSISTANT' as const,
  content: 'reviewed code',
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
  metadata: { rolePack: true, pack: 'coding-team', members: [] },
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

// Universal-research PR2: research-enricher dependency stub.
const mockResearchEnricherManager = {
  enrichForOrchestration: jest.fn().mockResolvedValue({ transcript: null, systemPrompt: '' }),
};

describe('RolePackManager', () => {
  let manager: RolePackManager;
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

    manager = new RolePackManager(
      messagesRepo as unknown as ChatMessagesRepository,
      threadsRepo as unknown as ChatThreadsRepository,
      streamService as unknown as ChatStreamService,
      mockResearchEnricherManager as any,
      createFakePaygAccessControl() as any,
    );

    jest.clearAllMocks();
    (httpClientModule.httpRequest as jest.Mock).mockResolvedValue({
      ok: true,
      status: 200,
      data: { response: 'mocked role output' },
    });
  });

  describe('executeRolePack', () => {
    it('should return messageId and threadId', async () => {
      messagesRepo.create!.mockResolvedValue(mockUserMessage);

      const result = await manager.executeRolePack(
        'user-1',
        {
          content: 'implement a login form',
          threadId: 'thread-role-1',
          pack: 'coding-team',
        },
        '',
      );

      expect(result).toHaveProperty('messageId');
      expect(result).toHaveProperty('threadId', 'thread-role-1');
    });

    it('should create a new thread when no threadId provided', async () => {
      threadsRepo.create!.mockResolvedValue(mockThread);
      messagesRepo.create!.mockResolvedValue(mockUserMessage);

      const result = await manager.executeRolePack(
        'user-1',
        {
          content: 'implement a login form',
          pack: 'coding-team',
        },
        '',
      );

      expect(threadsRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'user-1',
          routingMode: 'AUTO',
        }),
      );
      expect(result.threadId).toBe('thread-role-1');
    });
  });

  describe('executeInBackground', () => {
    it('should store ASSISTANT message with rolePack:true in metadata', async () => {
      messagesRepo.create!.mockResolvedValue(mockAssistantMessage);

      await manager.executeInBackground(
        'thread-role-1',
        'implement login',
        'coding-team',
        'user-1',
      );

      expect(messagesRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          role: 'ASSISTANT',
          metadata: expect.objectContaining({ rolePack: true }),
        }),
      );
    });

    it('should store pack name in metadata', async () => {
      messagesRepo.create!.mockResolvedValue(mockAssistantMessage);

      await manager.executeInBackground(
        'thread-role-1',
        'implement login',
        'coding-team',
        'user-1',
      );

      expect(messagesRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          metadata: expect.objectContaining({ pack: 'coding-team' }),
        }),
      );
    });

    it('should store all member results in metadata', async () => {
      messagesRepo.create!.mockResolvedValue(mockAssistantMessage);

      await manager.executeInBackground(
        'thread-role-1',
        'implement login',
        'coding-team',
        'user-1',
      );

      const call = (messagesRepo.create as jest.Mock).mock.calls[0][0] as Record<string, unknown>;
      const meta = call['metadata'] as Record<string, unknown>;
      const members = meta['members'] as unknown[];
      expect(Array.isArray(members)).toBe(true);
      expect(members).toHaveLength(3);
    });

    it('should emit SSE completion on success', async () => {
      messagesRepo.create!.mockResolvedValue(mockAssistantMessage);

      await manager.executeInBackground(
        'thread-role-1',
        'implement login',
        'coding-team',
        'user-1',
      );

      expect(streamService.emitCompletion).toHaveBeenCalledWith(
        'thread-role-1',
        'local-ollama',
        expect.any(String),
      );
    });

    it('should emit SSE error and store error message when Ollama fails', async () => {
      (httpClientModule.httpRequest as jest.Mock).mockRejectedValue(
        new Error('Ollama unreachable'),
      );
      messagesRepo.create!.mockResolvedValue(mockAssistantMessage);

      await manager.executeInBackground(
        'thread-role-1',
        'implement login',
        'coding-team',
        'user-1',
      );

      expect(streamService.emitError).toHaveBeenCalledWith('thread-role-1', expect.any(String));
      expect(messagesRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({ metadata: expect.objectContaining({ error: true }) }),
      );
    });

    it('should resolve (fire-and-forget) even when everything fails', async () => {
      (httpClientModule.httpRequest as jest.Mock).mockRejectedValue(new Error('Fatal'));
      messagesRepo.create!.mockRejectedValue(new Error('DB down'));

      await expect(
        manager.executeInBackground('thread-role-1', 'implement login', 'coding-team', 'user-1'),
      ).resolves.toBeUndefined();
    });

    it('should handle partial failures — some members succeed, some fail', async () => {
      (httpClientModule.httpRequest as jest.Mock)
        .mockResolvedValueOnce({ ok: true, status: 200, data: { response: 'coder output' } })
        .mockRejectedValueOnce(new Error('Debugger failed'))
        .mockResolvedValueOnce({ ok: true, status: 200, data: { response: 'reviewer output' } });

      messagesRepo.create!.mockResolvedValue(mockAssistantMessage);

      await manager.executeInBackground(
        'thread-role-1',
        'implement login',
        'coding-team',
        'user-1',
      );

      const call = (messagesRepo.create as jest.Mock).mock.calls[0][0] as Record<string, unknown>;
      const meta = call['metadata'] as Record<string, unknown>;
      const members = meta['members'] as Array<{ output: string }>;
      expect(members).toHaveLength(3);
      expect(members.some((m) => m.output === 'Role failed')).toBe(true);
      expect(members.some((m) => m.output !== 'Role failed')).toBe(true);
    });
  });

  describe('DTO validation', () => {
    it('should accept valid dto with coding-team', () => {
      const result = rolePackMessageSchema.safeParse({
        content: 'implement login form',
        pack: 'coding-team',
      });
      expect(result.success).toBe(true);
    });

    it('should reject empty content', () => {
      const result = rolePackMessageSchema.safeParse({ content: '', pack: 'coding-team' });
      expect(result.success).toBe(false);
    });

    it('should reject invalid pack name', () => {
      const result = rolePackMessageSchema.safeParse({
        content: 'some content',
        pack: 'invalid-team',
      });
      expect(result.success).toBe(false);
    });

    it('should default pack to coding-team when not provided', () => {
      const result = rolePackMessageSchema.safeParse({ content: 'hello' });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.pack).toBe('coding-team');
      }
    });

    it('should accept all valid pack names', () => {
      const packs = ['coding-team', 'research-team', 'marketing-team', 'legal-team'];
      for (const pack of packs) {
        const result = rolePackMessageSchema.safeParse({ content: 'hello', pack });
        expect(result.success).toBe(true);
      }
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
      const isolated = new RolePackManager(
        messagesRepo as unknown as ChatMessagesRepository,
        threadsRepo as unknown as ChatThreadsRepository,
        streamService as unknown as ChatStreamService,
        mockResearchEnricherManager as any,
        createFakePaygAccessControl() as any,
        selectionService as unknown as AdvancedModuleModelSelectionService,
      );

      await expect(
        isolated.executeRolePack(
          'user-1',
          {
            content: 'implement login',
            threadId: 'thread-role-1',
            pack: 'coding-team',
            requestedProvider: 'OPENAI',
            requestedModel: 'gpt-4.1',
            modelSelectionMode: ModelSelectionMode.MANUAL_MODEL,
          },
          '',
        ),
      ).rejects.toThrow('unsupported provider');
      expect(messagesRepo.create).not.toHaveBeenCalled();
    });

    it('MANUAL_MODEL: all roles execute with the single chosen model (documented single-model behavior)', async () => {
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
            pack: string,
            userId: string,
            selection: AdvancedModelSelectionResolution,
          ) => Promise<void>;
        }
      ).executeInBackground(
        'thread-role-1',
        'implement login',
        'coding-team',
        'user-1',
        manualResolution,
      );

      const assistantCall = (messagesRepo.create as jest.Mock).mock.calls.find(
        (call) => (call[0] as { role?: string }).role === 'ASSISTANT',
      );
      expect(assistantCall).toBeDefined();
      const metadata = (
        assistantCall![0] as {
          metadata?: {
            modelSelection?: AdvancedModelSelectionResolution;
            members?: Array<{ model?: string }>;
          };
        }
      ).metadata;
      expect(metadata?.modelSelection?.modelSelectionMode).toBe(ModelSelectionMode.MANUAL_MODEL);
      expect(metadata?.modelSelection?.actualModel).toBe('qwen2.5:7b');
      // All members should use the single manually-selected model
      for (const member of metadata?.members ?? []) {
        expect(member.model).toBe('qwen2.5:7b');
      }
    });
  });
});
