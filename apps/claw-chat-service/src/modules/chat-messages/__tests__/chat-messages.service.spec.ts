import { ChatMessagesService } from '../services/chat-messages.service';
import { type ChatMessagesRepository } from '../repositories/chat-messages.repository';
import { type ChatThreadsRepository } from '../../chat-threads/repositories/chat-threads.repository';
import { type ChatExecutionManager } from '../managers/chat-execution.manager';
import { type ContextAssemblyManager } from '../managers/context-assembly.manager';
import { type ChatStreamController } from '../controllers/chat-stream.controller';
import { type RabbitMQService } from '@claw/shared-rabbitmq';
import { EventPattern } from '@claw/shared-types';
import { BusinessException, EntityNotFoundException } from '../../../common/errors';

const mockThread = {
  id: 'thread-1',
  userId: 'user-1',
  title: 'Test Thread',
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

const mockMessage = {
  id: 'msg-1',
  threadId: 'thread-1',
  role: 'USER' as const,
  content: 'Hello world',
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

const mockMessagesRepository = (): Record<keyof ChatMessagesRepository, jest.Mock> => ({
  create: jest.fn(),
  findById: jest.fn(),
  findByThreadId: jest.fn(),
  findRecentByThreadId: jest.fn(),
  countByThreadId: jest.fn(),
  updateFeedback: jest.fn(),
  deleteByThreadId: jest.fn(),
});

const mockThreadsRepository = (): Partial<Record<keyof ChatThreadsRepository, jest.Mock>> => ({
  findById: jest.fn(),
});

const mockExecutionManager = (): Partial<Record<keyof ChatExecutionManager, jest.Mock>> => ({
  execute: jest.fn(),
});

const mockContextAssembly = (): Partial<Record<keyof ContextAssemblyManager, jest.Mock>> => ({
  assemble: jest.fn().mockResolvedValue({
    systemPrompt: null,
    threadMessages: [],
    memories: [],
    contextPackItems: [],
    fileChunks: [],
    tokenBudget: 4096,
  }),
  buildPromptString: jest.fn().mockReturnValue(''),
  buildChatMessages: jest.fn().mockReturnValue([]),
});

const mockRabbitMQ = (): Partial<Record<keyof RabbitMQService, jest.Mock>> => ({
  publish: jest.fn().mockResolvedValue(),
  subscribe: jest.fn().mockResolvedValue(),
});

describe('ChatMessagesService', () => {
  let service: ChatMessagesService;
  let messagesRepo: ReturnType<typeof mockMessagesRepository>;
  let threadsRepo: ReturnType<typeof mockThreadsRepository>;
  let executionManager: ReturnType<typeof mockExecutionManager>;
  let contextAssembly: ReturnType<typeof mockContextAssembly>;
  let rabbitMQ: ReturnType<typeof mockRabbitMQ>;

  beforeEach(() => {
    messagesRepo = mockMessagesRepository();
    threadsRepo = mockThreadsRepository();
    executionManager = mockExecutionManager();
    contextAssembly = mockContextAssembly();
    rabbitMQ = mockRabbitMQ();
    service = new ChatMessagesService(
      messagesRepo as unknown as ChatMessagesRepository,
      threadsRepo as unknown as ChatThreadsRepository,
      executionManager as unknown as ChatExecutionManager,
      contextAssembly as unknown as ContextAssemblyManager,
      { emitCompletion: jest.fn() } as unknown as ChatStreamController,
      rabbitMQ as unknown as RabbitMQService,
    );
  });

  describe('createMessage', () => {
    it('should create a message and publish event', async () => {
      threadsRepo.findById!.mockResolvedValue(mockThread);
      messagesRepo.create.mockResolvedValue(mockMessage);

      const result = await service.createMessage('user-1', {
        threadId: 'thread-1',
        content: 'Hello world',
      });

      expect(result).toEqual(mockMessage);
      expect(messagesRepo.create).toHaveBeenCalledWith({
        threadId: 'thread-1',
        role: 'USER',
        content: 'Hello world',
        routingMode: 'AUTO',
      });
      expect(rabbitMQ.publish).toHaveBeenCalledWith(
        EventPattern.MESSAGE_CREATED,
        expect.objectContaining({
          messageId: 'msg-1',
          threadId: 'thread-1',
          userId: 'user-1',
        }),
      );
    });

    it('should throw EntityNotFoundException when thread not found', async () => {
      threadsRepo.findById!.mockResolvedValue(null);

      await expect(
        service.createMessage('user-1', { threadId: 'nonexistent', content: 'Hello' }),
      ).rejects.toThrow(EntityNotFoundException);
    });

    it('should throw BusinessException when user does not own thread', async () => {
      threadsRepo.findById!.mockResolvedValue(mockThread);

      await expect(
        service.createMessage('other-user', { threadId: 'thread-1', content: 'Hello' }),
      ).rejects.toThrow(BusinessException);
    });
  });

  describe('getMessages', () => {
    it('should return paginated messages', async () => {
      threadsRepo.findById!.mockResolvedValue(mockThread);
      messagesRepo.findByThreadId.mockResolvedValue([mockMessage]);
      messagesRepo.countByThreadId.mockResolvedValue(1);

      const result = await service.getMessages('thread-1', 'user-1', {
        page: 1,
        limit: 50,
      });

      expect(result.data).toHaveLength(1);
      expect(result.meta.total).toBe(1);
      expect(result.meta.page).toBe(1);
      expect(result.meta.totalPages).toBe(1);
    });

    it('should throw EntityNotFoundException when thread not found', async () => {
      threadsRepo.findById!.mockResolvedValue(null);

      await expect(
        service.getMessages('nonexistent', 'user-1', { page: 1, limit: 50 }),
      ).rejects.toThrow(EntityNotFoundException);
    });
  });

  describe('getMessage', () => {
    it('should return message when found and user owns thread', async () => {
      messagesRepo.findById.mockResolvedValue(mockMessage);
      threadsRepo.findById!.mockResolvedValue(mockThread);

      const result = await service.getMessage('msg-1', 'user-1');

      expect(result).toEqual(mockMessage);
    });

    it('should throw EntityNotFoundException when message not found', async () => {
      messagesRepo.findById.mockResolvedValue(null);

      await expect(service.getMessage('nonexistent', 'user-1')).rejects.toThrow(
        EntityNotFoundException,
      );
    });

    it('should throw BusinessException when user does not own thread', async () => {
      messagesRepo.findById.mockResolvedValue(mockMessage);
      threadsRepo.findById!.mockResolvedValue(mockThread);

      await expect(service.getMessage('msg-1', 'other-user')).rejects.toThrow(BusinessException);
    });

    it('should throw EntityNotFoundException when thread not found for message', async () => {
      messagesRepo.findById.mockResolvedValue(mockMessage);
      threadsRepo.findById!.mockResolvedValue(null);

      await expect(service.getMessage('msg-1', 'user-1')).rejects.toThrow(EntityNotFoundException);
    });
  });

  describe('regenerateMessage', () => {
    it('should publish regeneration event and return message', async () => {
      messagesRepo.findById.mockResolvedValue(mockMessage);
      threadsRepo.findById!.mockResolvedValue(mockThread);

      const result = await service.regenerateMessage('msg-1', 'user-1');

      expect(result).toEqual(mockMessage);
      expect(rabbitMQ.publish).toHaveBeenCalledWith(
        EventPattern.MESSAGE_CREATED,
        expect.objectContaining({
          messageId: 'msg-1',
          threadId: 'thread-1',
          userId: 'user-1',
          regenerate: true,
        }),
      );
    });

    it('should throw EntityNotFoundException when message not found', async () => {
      messagesRepo.findById.mockResolvedValue(null);

      await expect(service.regenerateMessage('nonexistent', 'user-1')).rejects.toThrow(
        EntityNotFoundException,
      );
    });

    it('should throw EntityNotFoundException when thread not found', async () => {
      messagesRepo.findById.mockResolvedValue(mockMessage);
      threadsRepo.findById!.mockResolvedValue(null);

      await expect(service.regenerateMessage('msg-1', 'user-1')).rejects.toThrow(
        EntityNotFoundException,
      );
    });

    it('should throw BusinessException when user does not own thread', async () => {
      messagesRepo.findById.mockResolvedValue(mockMessage);
      threadsRepo.findById!.mockResolvedValue(mockThread);

      await expect(service.regenerateMessage('msg-1', 'other-user')).rejects.toThrow(
        BusinessException,
      );
    });
  });

  describe('getMessages - edge cases', () => {
    it('should throw BusinessException when user does not own thread', async () => {
      threadsRepo.findById!.mockResolvedValue(mockThread);

      await expect(
        service.getMessages('thread-1', 'other-user', { page: 1, limit: 50 }),
      ).rejects.toThrow(BusinessException);
    });

    it('should calculate totalPages correctly for multiple pages', async () => {
      threadsRepo.findById!.mockResolvedValue(mockThread);
      messagesRepo.findByThreadId.mockResolvedValue([mockMessage]);
      messagesRepo.countByThreadId.mockResolvedValue(75);

      const result = await service.getMessages('thread-1', 'user-1', {
        page: 1,
        limit: 20,
      });

      expect(result.meta.totalPages).toBe(4);
      expect(result.meta.total).toBe(75);
    });
  });
});
