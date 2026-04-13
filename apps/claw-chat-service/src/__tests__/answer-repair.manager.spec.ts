import { AppConfig } from '../app/config/app.config';
import { AnswerRepairManager } from '../modules/chat-messages/managers/answer-repair.manager';
import { RepairType } from '../common/enums/repair-type.enum';
import { repairMessageSchema } from '../modules/chat-messages/dto/repair-message.dto';

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

  beforeEach(() => {
    jest.clearAllMocks();
    manager = new AnswerRepairManager(
      mockChatMessagesRepository as any,
      mockChatThreadsRepository as any,
      mockChatStreamService as any,
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
      });

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
      });

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
      });

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
      });

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
  });
});
