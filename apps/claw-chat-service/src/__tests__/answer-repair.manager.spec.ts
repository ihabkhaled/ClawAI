import { AppConfig } from '../app/config/app.config';
import { BusinessException } from '../common/errors';
import { ModelSelectionMode } from '../common/enums/model-selection-mode.enum';
import { AnswerRepairManager } from '../modules/chat-messages/managers/answer-repair.manager';
import { RepairType } from '../common/enums/repair-type.enum';
import { repairMessageSchema } from '../modules/chat-messages/dto/repair-message.dto';
import type { AdvancedModelSelectionResolution } from '../modules/chat-messages/types/advanced-model-selection.types';

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

const mockHttpRequest = jest.fn();
jest.mock('../common/utilities/http-client.utility', () => ({
  httpRequest: (...args: any[]) => mockHttpRequest(...args),
}));

describe('AnswerRepairManager', () => {
  let manager: AnswerRepairManager;

  const mockChatMessagesRepository = {
    create: jest.fn(),
    findById: jest.fn(),
  };

  const mockChatThreadsRepository = {
    findById: jest.fn(),
    create: jest.fn(),
  };

  const mockChatStreamService = {
    emitCompletion: jest.fn(),
    emitError: jest.fn(),
  };

  // Universal-research PR2: orchestration managers now take a
  // ResearchEnricherManager. Default stub returns the no-op shape so existing
  // tests don't accidentally invoke web-research.
  const mockResearchEnricherManager = {
    enrichForOrchestration: jest
      .fn()
      .mockResolvedValue({ transcript: null, systemPrompt: '' }),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockResearchEnricherManager.enrichForOrchestration.mockResolvedValue({
      transcript: null,
      systemPrompt: '',
    });
    manager = new AnswerRepairManager(
      mockChatMessagesRepository as any,
      mockChatThreadsRepository as any,
      mockChatStreamService as any,
      mockResearchEnricherManager as any,
    );
  });

  describe('executeRepair', () => {
    it('happy path: repair with FORMAT type queues background task and returns messageId/threadId', async () => {
      mockChatMessagesRepository.create.mockResolvedValue({ id: 'msg-1' });
      mockHttpRequest.mockResolvedValue({
        ok: true,
        status: 200,
        data: { response: 'Repaired content with proper **formatting**' },
      });

      const result = await manager.executeRepair('user-1', {
        content: 'Some poorly formatted answer',
        threadId: 'thread-1',
        repairTypes: [RepairType.FORMAT],
      }, '');

      expect(result.messageId).toBe('msg-1');
      expect(result.threadId).toBe('thread-1');
      expect(mockChatMessagesRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({ threadId: 'thread-1', role: 'USER' }),
      );
    });

    it('happy path: repair with multiple types passes all types to buildRepairPrompt', async () => {
      mockChatMessagesRepository.create.mockResolvedValue({ id: 'msg-2' });
      mockHttpRequest.mockResolvedValue({
        ok: true,
        status: 200,
        data: { response: 'Repaired content' },
      });

      const result = await manager.executeRepair('user-1', {
        content: 'Incomplete schema with bad formatting',
        threadId: 'thread-2',
        repairTypes: [RepairType.SCHEMA, RepairType.FORMAT, RepairType.COMPLETENESS],
      }, '');

      expect(result.threadId).toBe('thread-2');
    });

    it('creates a new thread when no threadId is provided', async () => {
      mockChatThreadsRepository.create.mockResolvedValue({ id: 'new-thread-1' });
      mockChatMessagesRepository.create.mockResolvedValue({ id: 'msg-3' });
      mockHttpRequest.mockResolvedValue({
        ok: true,
        status: 200,
        data: { response: 'Repaired' },
      });

      const result = await manager.executeRepair('user-1', {
        content: 'Some content to repair',
        repairTypes: [RepairType.COMPLETENESS],
      }, '');

      expect(mockChatThreadsRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({ userId: 'user-1' }),
      );
      expect(result.threadId).toBe('new-thread-1');
    });

    it('resolves content from messageId when content is not provided', async () => {
      mockChatMessagesRepository.findById.mockResolvedValue({
        id: 'existing-msg',
        content: 'Original message content',
      });
      mockChatMessagesRepository.create.mockResolvedValue({ id: 'msg-4' });
      mockHttpRequest.mockResolvedValue({
        ok: true,
        status: 200,
        data: { response: 'Repaired from messageId' },
      });

      const result = await manager.executeRepair('user-1', {
        messageId: 'existing-msg',
        threadId: 'thread-3',
        repairTypes: [RepairType.FACTUALITY],
      }, '');

      expect(mockChatMessagesRepository.findById).toHaveBeenCalledWith('existing-msg');
      expect(result.messageId).toBe('msg-4');
    });
  });

  describe('buildRepairPrompt', () => {
    it('includes SCHEMA instruction when SCHEMA type is requested', () => {
      const prompt = manager.buildRepairPrompt('test content', [RepairType.SCHEMA]);
      expect(prompt).toContain('SCHEMA');
      expect(prompt).toContain('JSON');
      expect(prompt).toContain('test content');
    });

    it('includes FORMAT instruction when FORMAT type is requested', () => {
      const prompt = manager.buildRepairPrompt('test content', [RepairType.FORMAT]);
      expect(prompt).toContain('FORMAT');
      expect(prompt).toContain('markdown');
    });

    it('includes COMPLETENESS instruction when COMPLETENESS type is requested', () => {
      const prompt = manager.buildRepairPrompt('test content', [RepairType.COMPLETENESS]);
      expect(prompt).toContain('COMPLETENESS');
      expect(prompt).toContain('incomplete');
    });

    it('includes FACTUALITY instruction when FACTUALITY type is requested', () => {
      const prompt = manager.buildRepairPrompt('test content', [RepairType.FACTUALITY]);
      expect(prompt).toContain('FACTUALITY');
      expect(prompt).toContain('factual');
    });

    it('includes all instructions when all repair types are requested', () => {
      const prompt = manager.buildRepairPrompt('test content', [
        RepairType.SCHEMA,
        RepairType.FORMAT,
        RepairType.COMPLETENESS,
        RepairType.FACTUALITY,
      ]);
      expect(prompt).toContain('SCHEMA');
      expect(prompt).toContain('FORMAT');
      expect(prompt).toContain('COMPLETENESS');
      expect(prompt).toContain('FACTUALITY');
    });

    it('ends with instruction to return only the repaired answer', () => {
      const prompt = manager.buildRepairPrompt('content', [RepairType.FORMAT]);
      expect(prompt).toContain('Return ONLY the repaired answer');
    });
  });

  describe('executeRepair — background task behavior', () => {
    it('stores ASSISTANT message with repaired metadata on success', async () => {
      const createMock = jest
        .fn()
        .mockResolvedValueOnce({ id: 'user-msg' })
        .mockResolvedValueOnce({ id: 'assistant-msg' });
      const isolatedRepo = { ...mockChatMessagesRepository, create: createMock };
      const isolatedManager = new AnswerRepairManager(isolatedRepo as any, mockChatThreadsRepository as any, mockChatStreamService as any, mockResearchEnricherManager as any,);
      mockHttpRequest.mockResolvedValue({
        ok: true,
        status: 200,
        data: { response: 'Properly repaired content' },
      });

      await isolatedManager.executeRepair('user-1', {
        content: 'Original answer',
        threadId: 'thread-bg',
        repairTypes: [RepairType.FORMAT],
      }, '');
      // allow background to settle
      await new Promise((resolve) => setTimeout(resolve, 50));

      expect(createMock).toHaveBeenCalledTimes(2);
      expect(createMock).toHaveBeenNthCalledWith(
        2,
        expect.objectContaining({
          role: 'ASSISTANT',
          metadata: expect.objectContaining({ repaired: true }),
        }),
      );
    });

    it('emits SSE completion after successful repair', async () => {
      const createMock = jest
        .fn()
        .mockResolvedValueOnce({ id: 'u-1' })
        .mockResolvedValueOnce({ id: 'a-1' });
      const streamMock = { emitCompletion: jest.fn(), emitError: jest.fn() };
      const isolatedManager = new AnswerRepairManager(
      { ...mockChatMessagesRepository, create: createMock } as any,
      mockChatThreadsRepository as any,
      streamMock as any,
      mockResearchEnricherManager as any,
    );
      mockHttpRequest.mockResolvedValue({
        ok: true,
        status: 200,
        data: { response: 'Repaired' },
      });

      await isolatedManager.executeRepair('user-1', {
        content: 'Answer',
        threadId: 'thread-sse',
        repairTypes: [RepairType.SCHEMA],
      }, '');
      await new Promise((resolve) => setTimeout(resolve, 50));

      expect(streamMock.emitCompletion).toHaveBeenCalledWith(
        'thread-sse',
        expect.any(String),
        expect.any(String),
      );
    });

    it('stores repairTypes in ASSISTANT metadata correctly', async () => {
      const createMock = jest
        .fn()
        .mockResolvedValueOnce({ id: 'u-2' })
        .mockResolvedValueOnce({ id: 'a-2' });
      const isolatedManager = new AnswerRepairManager(
      { ...mockChatMessagesRepository, create: createMock } as any,
      mockChatThreadsRepository as any,
      mockChatStreamService as any,
      mockResearchEnricherManager as any,
    );
      mockHttpRequest.mockResolvedValue({
        ok: true,
        status: 200,
        data: { response: 'Fixed' },
      });

      await isolatedManager.executeRepair('user-1', {
        content: 'Text',
        threadId: 'thread-meta',
        repairTypes: [RepairType.COMPLETENESS, RepairType.FACTUALITY],
      }, '');
      await new Promise((resolve) => setTimeout(resolve, 50));

      expect(createMock).toHaveBeenNthCalledWith(
        2,
        expect.objectContaining({
          metadata: expect.objectContaining({
            repairTypes: [RepairType.COMPLETENESS, RepairType.FACTUALITY],
          }),
        }),
      );
    });

    it('emits SSE error then stores error message when Ollama fails', async () => {
      const createMock = jest
        .fn()
        .mockResolvedValueOnce({ id: 'u-3' })
        .mockResolvedValueOnce({ id: 'err-msg' });
      const streamMock = { emitCompletion: jest.fn(), emitError: jest.fn() };
      const isolatedManager = new AnswerRepairManager(
      { ...mockChatMessagesRepository, create: createMock } as any,
      mockChatThreadsRepository as any,
      streamMock as any,
      mockResearchEnricherManager as any,
    );
      mockHttpRequest.mockResolvedValue({ ok: false, status: 503, data: {} });

      await isolatedManager.executeRepair('user-1', {
        content: 'Content',
        threadId: 'thread-fail',
        repairTypes: [RepairType.FORMAT],
      }, '');
      await new Promise((resolve) => setTimeout(resolve, 50));

      expect(streamMock.emitError).toHaveBeenCalledWith(
        'thread-fail',
        expect.stringContaining('repair failed'),
      );
      expect(createMock).toHaveBeenNthCalledWith(
        2,
        expect.objectContaining({
          role: 'ASSISTANT',
          metadata: expect.objectContaining({ error: true }),
        }),
      );
    });

    it('executeRepair always resolves even when background Ollama fails (fire-and-forget)', async () => {
      const createMock = jest
        .fn()
        .mockResolvedValueOnce({ id: 'u-4' })
        .mockResolvedValue({ id: 'err-4' });
      const streamMock = { emitCompletion: jest.fn(), emitError: jest.fn() };
      const isolatedManager = new AnswerRepairManager(
      { ...mockChatMessagesRepository, create: createMock } as any,
      mockChatThreadsRepository as any,
      streamMock as any,
      mockResearchEnricherManager as any,
    );
      mockHttpRequest.mockResolvedValue({ ok: false, status: 500, data: {} });

      await expect(
        isolatedManager.executeRepair('user-1', {
          content: 'test',
          threadId: 'thread-ff',
          repairTypes: [RepairType.SCHEMA],
        }, ''),
      ).resolves.toMatchObject({ messageId: 'u-4', threadId: 'thread-ff' });
    });

    it('throws from resolveOriginalContent when messageId not found', async () => {
      mockChatMessagesRepository.findById.mockResolvedValue(null);

      await expect(
        manager.executeRepair('user-1', {
          messageId: 'non-existent-msg',
          threadId: 'thread-x',
          repairTypes: [RepairType.FORMAT],
        }, ''),
      ).rejects.toThrow('Could not resolve original content to repair');
    });

    it('throws when Ollama returns empty response string', async () => {
      const createMock = jest
        .fn()
        .mockResolvedValueOnce({ id: 'u-5' })
        .mockResolvedValue({ id: 'err-5' });
      const streamMock = { emitCompletion: jest.fn(), emitError: jest.fn() };
      const isolatedManager = new AnswerRepairManager(
      { ...mockChatMessagesRepository, create: createMock } as any,
      mockChatThreadsRepository as any,
      streamMock as any,
      mockResearchEnricherManager as any,
    );
      mockHttpRequest.mockResolvedValue({ ok: true, status: 200, data: { response: '   ' } });

      await isolatedManager.executeRepair('user-1', {
        content: 'Something',
        threadId: 'thread-empty',
        repairTypes: [RepairType.COMPLETENESS],
      }, '');
      await new Promise((resolve) => setTimeout(resolve, 50));

      expect(streamMock.emitError).toHaveBeenCalledWith(
        'thread-empty',
        expect.stringContaining('empty'),
      );
    });

    it('uses the requested local model in ASSISTANT metadata when provided', async () => {
      const createMock = jest
        .fn()
        .mockResolvedValueOnce({ id: 'u-6' })
        .mockResolvedValueOnce({ id: 'a-6' });
      const isolatedManager = new AnswerRepairManager(
      { ...mockChatMessagesRepository, create: createMock } as any,
      mockChatThreadsRepository as any,
      mockChatStreamService as any,
      mockResearchEnricherManager as any,
    );
      mockHttpRequest.mockResolvedValue({
        ok: true,
        status: 200,
        data: { response: 'Repaired with custom model' },
      });

      await isolatedManager.executeRepair('user-1', {
        content: 'Text to fix',
        threadId: 'thread-model',
        repairTypes: [RepairType.SCHEMA],
        targetProvider: 'local-ollama',
        targetModel: 'qwen2.5:7b',
      }, '');
      await new Promise((resolve) => setTimeout(resolve, 50));

      expect(createMock).toHaveBeenNthCalledWith(
        2,
        expect.objectContaining({
          provider: 'local-ollama',
          model: 'qwen2.5:7b',
          metadata: expect.objectContaining({
            repairProvider: 'local-ollama',
            repairModel: 'qwen2.5:7b',
          }),
        }),
      );
    });

    it('rejects unsupported manual providers before queuing a repair request', async () => {
      const selectionService = {
        resolveSelection: jest
          .fn()
          .mockRejectedValue(
            new BusinessException(
              'unsupported provider',
              'ADVANCED_MODULE_MODEL_PROVIDER_UNSUPPORTED',
            ),
          ),
      };
      const isolatedManager = new AnswerRepairManager(
      mockChatMessagesRepository as any,
      mockChatThreadsRepository as any,
      mockChatStreamService as any,
      mockResearchEnricherManager as any,
      selectionService as any,
    );

      await expect(
        isolatedManager.executeRepair('user-1', {
          content: 'Text to fix',
          threadId: 'thread-invalid',
          repairTypes: [RepairType.FORMAT],
          requestedProvider: 'OPENAI',
          requestedModel: 'gpt-4.1',
        }, ''),
      ).rejects.toThrow('unsupported provider');
      expect(mockChatMessagesRepository.create).not.toHaveBeenCalled();
    });

    it('stores model-selection metadata for manual repair execution', async () => {
      const manualSelection: AdvancedModelSelectionResolution = {
        modelSelectionMode: ModelSelectionMode.MANUAL_MODEL,
        requestedProvider: 'local-ollama',
        requestedModel: 'qwen2.5:7b',
        requestedDisplayName: 'qwen2.5:7b',
        selectedModelSource: 'LOCAL',
        actualProvider: 'local-ollama',
        actualModel: 'qwen2.5:7b',
      };
      const createMock = jest.fn().mockResolvedValue({ id: 'a-8' });
      const isolatedManager = new AnswerRepairManager(
      { ...mockChatMessagesRepository, create: createMock } as any,
      mockChatThreadsRepository as any,
      mockChatStreamService as any,
      mockResearchEnricherManager as any,
    );
      mockHttpRequest.mockResolvedValue({
        ok: true,
        status: 200,
        data: { response: 'Manual local repair' },
      });

      await (isolatedManager as any).executeInBackground(
        'thread-manual',
        'Text to fix',
        [RepairType.FORMAT],
        manualSelection,
      );

      expect(createMock).toHaveBeenCalledWith(
        expect.objectContaining({
          model: 'qwen2.5:7b',
          metadata: expect.objectContaining({
            modelSelection: expect.objectContaining({
              actualModel: 'qwen2.5:7b',
              requestedModel: 'qwen2.5:7b',
            }),
          }),
        }),
      );
    });

    it('defaults to local-ollama/AUTO when no targetProvider/targetModel given', async () => {
      const createMock = jest
        .fn()
        .mockResolvedValueOnce({ id: 'u-7' })
        .mockResolvedValueOnce({ id: 'a-7' });
      const isolatedManager = new AnswerRepairManager(
      { ...mockChatMessagesRepository, create: createMock } as any,
      mockChatThreadsRepository as any,
      mockChatStreamService as any,
      mockResearchEnricherManager as any,
    );
      mockHttpRequest.mockResolvedValue({
        ok: true,
        status: 200,
        data: { response: 'Default model repair' },
      });

      await isolatedManager.executeRepair('user-1', {
        content: 'Plain text',
        threadId: 'thread-default',
        repairTypes: [RepairType.FORMAT],
      }, '');
      await new Promise((resolve) => setTimeout(resolve, 50));

      expect(createMock).toHaveBeenNthCalledWith(
        2,
        expect.objectContaining({
          provider: 'local-ollama',
          model: 'AUTO',
        }),
      );
    });
  });

  describe('DTO validation', () => {
    it('accepts valid input with content and repairTypes', () => {
      const result = repairMessageSchema.safeParse({
        content: 'Some answer to repair',
        repairTypes: [RepairType.FORMAT],
      });
      expect(result.success).toBe(true);
    });

    it('accepts valid input with messageId and repairTypes', () => {
      const result = repairMessageSchema.safeParse({
        messageId: 'msg-abc',
        repairTypes: [RepairType.SCHEMA],
      });
      expect(result.success).toBe(true);
    });

    it('rejects input when neither messageId nor content is provided', () => {
      const result = repairMessageSchema.safeParse({
        repairTypes: [RepairType.FORMAT],
      });
      expect(result.success).toBe(false);
    });

    it('rejects input with empty repairTypes array', () => {
      const result = repairMessageSchema.safeParse({
        content: 'Some content',
        repairTypes: [],
      });
      expect(result.success).toBe(false);
    });

    it('rejects input with more than 4 repair types', () => {
      const result = repairMessageSchema.safeParse({
        content: 'Some content',
        repairTypes: [
          RepairType.FORMAT,
          RepairType.SCHEMA,
          RepairType.COMPLETENESS,
          RepairType.FACTUALITY,
          RepairType.FORMAT,
        ],
      });
      expect(result.success).toBe(false);
    });

    it('accepts all 4 repair types simultaneously', () => {
      const result = repairMessageSchema.safeParse({
        content: 'Some content',
        repairTypes: [
          RepairType.SCHEMA,
          RepairType.FORMAT,
          RepairType.COMPLETENESS,
          RepairType.FACTUALITY,
        ],
      });
      expect(result.success).toBe(true);
    });

    it('rejects unknown repairType enum value', () => {
      const result = repairMessageSchema.safeParse({
        content: 'Some content',
        repairTypes: ['INVALID_TYPE'],
      });
      expect(result.success).toBe(false);
    });

    it('rejects content that exceeds 50000 characters', () => {
      const result = repairMessageSchema.safeParse({
        content: 'x'.repeat(50_001),
        repairTypes: [RepairType.FORMAT],
      });
      expect(result.success).toBe(false);
    });

    it('accepts content at exactly 50000 characters', () => {
      const result = repairMessageSchema.safeParse({
        content: 'x'.repeat(50_000),
        repairTypes: [RepairType.FORMAT],
      });
      expect(result.success).toBe(true);
    });

    it('accepts optional threadId, targetProvider, targetModel fields', () => {
      const result = repairMessageSchema.safeParse({
        content: 'Some content',
        repairTypes: [RepairType.SCHEMA],
        threadId: 'thread-123',
        targetProvider: 'anthropic',
        targetModel: 'claude-sonnet-4',
      });
      expect(result.success).toBe(true);
    });

    it('rejects empty string content', () => {
      const result = repairMessageSchema.safeParse({
        content: '',
        repairTypes: [RepairType.FORMAT],
      });
      expect(result.success).toBe(false);
    });

    it('rejects messageId exceeding 255 characters', () => {
      const result = repairMessageSchema.safeParse({
        messageId: 'x'.repeat(256),
        repairTypes: [RepairType.FORMAT],
      });
      expect(result.success).toBe(false);
    });
  });
});
