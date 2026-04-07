import { ChatThreadsService } from '../services/chat-threads.service';
import { type ChatThreadsRepository } from '../repositories/chat-threads.repository';
import { type ChatMessagesRepository } from '../../chat-messages/repositories/chat-messages.repository';
import { type RabbitMQService } from '@claw/shared-rabbitmq';
import { SortOrder } from '../../../common/enums';
import { BusinessException, EntityNotFoundException } from '../../../common/errors';

const mockThread = {
  id: 'thread-1',
  userId: 'user-1',
  title: 'Test Thread',
  routingMode: 'AUTO' as const,
  lastProvider: null,
  lastModel: null,
  isPinned: false,
  isArchived: false,
  createdAt: new Date(),
  updatedAt: new Date(),
};

const mockThreadWithCount = {
  ...mockThread,
  _count: { messages: 5 },
};

const mockThreadsRepository = (): Record<keyof ChatThreadsRepository, jest.Mock> => ({
  create: jest.fn(),
  findById: jest.fn(),
  findAll: jest.fn(),
  update: jest.fn(),
  delete: jest.fn(),
  countAll: jest.fn(),
});

const mockMessagesRepository = (): Partial<Record<keyof ChatMessagesRepository, jest.Mock>> => ({
  deleteByThreadId: jest.fn().mockResolvedValue(0),
});

const mockRabbitMQ = (): Partial<Record<keyof RabbitMQService, jest.Mock>> => ({
  publish: jest.fn().mockResolvedValue(),
});

describe('ChatThreadsService', () => {
  let service: ChatThreadsService;
  let threadsRepo: ReturnType<typeof mockThreadsRepository>;
  let messagesRepo: ReturnType<typeof mockMessagesRepository>;
  let rabbitMQ: ReturnType<typeof mockRabbitMQ>;

  beforeEach(() => {
    threadsRepo = mockThreadsRepository();
    messagesRepo = mockMessagesRepository();
    rabbitMQ = mockRabbitMQ();
    service = new ChatThreadsService(
      threadsRepo as unknown as ChatThreadsRepository,
      messagesRepo as unknown as ChatMessagesRepository,
      rabbitMQ as unknown as RabbitMQService,
    );
  });

  describe('createThread', () => {
    it('should create a thread and publish event', async () => {
      threadsRepo.create.mockResolvedValue(mockThread);

      const result = await service.createThread('user-1', { title: 'Test Thread' });

      expect(result).toEqual(mockThread);
      expect(threadsRepo.create).toHaveBeenCalledWith({
        userId: 'user-1',
        title: 'Test Thread',
        routingMode: undefined,
      });
      expect(rabbitMQ.publish).toHaveBeenCalledWith(
        'thread.created',
        expect.objectContaining({
          threadId: 'thread-1',
          userId: 'user-1',
        }),
      );
    });
  });

  describe('getThreads', () => {
    it('should return paginated threads', async () => {
      threadsRepo.findAll.mockResolvedValue([mockThreadWithCount]);
      threadsRepo.countAll.mockResolvedValue(1);

      const result = await service.getThreads('user-1', {
        page: 1,
        limit: 20,
        sortBy: 'updatedAt',
        sortOrder: SortOrder.DESC,
      });

      expect(result.data).toHaveLength(1);
      expect(result.meta.total).toBe(1);
      expect(result.meta.page).toBe(1);
      expect(result.meta.totalPages).toBe(1);
    });

    it('should pass filters to repository', async () => {
      threadsRepo.findAll.mockResolvedValue([]);
      threadsRepo.countAll.mockResolvedValue(0);

      await service.getThreads('user-1', {
        page: 1,
        limit: 20,
        search: 'test',
        isPinned: true,
        sortBy: 'updatedAt',
        sortOrder: SortOrder.DESC,
      });

      expect(threadsRepo.findAll).toHaveBeenCalledWith(
        { userId: 'user-1', search: 'test', isPinned: true, isArchived: undefined },
        1,
        20,
        'updatedAt',
        'desc',
      );
    });
  });

  describe('getThread', () => {
    it('should return thread when found and owned by user', async () => {
      threadsRepo.findById.mockResolvedValue(mockThread);

      const result = await service.getThread('thread-1', 'user-1');

      expect(result).toEqual(mockThread);
    });

    it('should throw EntityNotFoundException when not found', async () => {
      threadsRepo.findById.mockResolvedValue(null);

      await expect(service.getThread('nonexistent', 'user-1')).rejects.toThrow(
        EntityNotFoundException,
      );
    });

    it('should throw BusinessException when user does not own thread', async () => {
      threadsRepo.findById.mockResolvedValue(mockThread);

      await expect(service.getThread('thread-1', 'other-user')).rejects.toThrow(BusinessException);
    });
  });

  describe('updateThread', () => {
    it('should update thread successfully', async () => {
      const updated = { ...mockThread, title: 'Updated Title' };
      threadsRepo.findById.mockResolvedValue(mockThread);
      threadsRepo.update.mockResolvedValue(updated);

      const result = await service.updateThread('thread-1', 'user-1', {
        title: 'Updated Title',
      });

      expect(result.title).toBe('Updated Title');
      expect(threadsRepo.update).toHaveBeenCalledWith('thread-1', {
        title: 'Updated Title',
        isPinned: undefined,
        isArchived: undefined,
        routingMode: undefined,
      });
    });

    it('should throw EntityNotFoundException when not found', async () => {
      threadsRepo.findById.mockResolvedValue(null);

      await expect(service.updateThread('nonexistent', 'user-1', { title: 'New' })).rejects.toThrow(
        EntityNotFoundException,
      );
    });
  });

  describe('deleteThread', () => {
    it('should delete thread and its messages', async () => {
      threadsRepo.findById.mockResolvedValue(mockThread);
      threadsRepo.delete.mockResolvedValue(mockThread);

      const result = await service.deleteThread('thread-1', 'user-1');

      expect(result).toEqual(mockThread);
      expect(messagesRepo.deleteByThreadId).toHaveBeenCalledWith('thread-1');
      expect(threadsRepo.delete).toHaveBeenCalledWith('thread-1');
    });

    it('should throw EntityNotFoundException when not found', async () => {
      threadsRepo.findById.mockResolvedValue(null);

      await expect(service.deleteThread('nonexistent', 'user-1')).rejects.toThrow(
        EntityNotFoundException,
      );
    });

    it('should throw BusinessException when user does not own thread', async () => {
      threadsRepo.findById.mockResolvedValue(mockThread);

      await expect(service.deleteThread('thread-1', 'other-user')).rejects.toThrow(
        BusinessException,
      );
    });
  });

  describe('updateThread - edge cases', () => {
    it('should throw BusinessException when user does not own thread', async () => {
      threadsRepo.findById.mockResolvedValue(mockThread);

      await expect(
        service.updateThread('thread-1', 'other-user', { title: 'New' }),
      ).rejects.toThrow(BusinessException);
    });

    it('should pass all update fields to repository', async () => {
      threadsRepo.findById.mockResolvedValue(mockThread);
      threadsRepo.update.mockResolvedValue({
        ...mockThread,
        title: 'Updated',
        isPinned: true,
        isArchived: false,
        routingMode: 'LOCAL_ONLY' as const,
      });

      await service.updateThread('thread-1', 'user-1', {
        title: 'Updated',
        isPinned: true,
        isArchived: false,
        routingMode: 'LOCAL_ONLY' as const,
      });

      expect(threadsRepo.update).toHaveBeenCalledWith('thread-1', {
        title: 'Updated',
        isPinned: true,
        isArchived: false,
        routingMode: 'LOCAL_ONLY',
      });
    });
  });

  describe('getThreads - edge cases', () => {
    it('should calculate totalPages correctly for multiple pages', async () => {
      threadsRepo.findAll.mockResolvedValue([mockThreadWithCount]);
      threadsRepo.countAll.mockResolvedValue(55);

      const result = await service.getThreads('user-1', {
        page: 1,
        limit: 20,
        sortBy: 'updatedAt',
        sortOrder: SortOrder.DESC,
      });

      expect(result.meta.totalPages).toBe(3);
      expect(result.meta.total).toBe(55);
    });

    it('should return empty data when no threads exist', async () => {
      threadsRepo.findAll.mockResolvedValue([]);
      threadsRepo.countAll.mockResolvedValue(0);

      const result = await service.getThreads('user-1', {
        page: 1,
        limit: 20,
        sortBy: 'updatedAt',
        sortOrder: SortOrder.DESC,
      });

      expect(result.data).toHaveLength(0);
      expect(result.meta.total).toBe(0);
      expect(result.meta.totalPages).toBe(0);
    });
  });

  describe('createThread - edge cases', () => {
    it('should create thread with routing mode', async () => {
      const threadWithMode = { ...mockThread, routingMode: 'HIGH_REASONING' as const };
      threadsRepo.create.mockResolvedValue(threadWithMode);

      const result = await service.createThread('user-1', {
        title: 'Test',
        routingMode: 'HIGH_REASONING' as const,
      });

      expect(result.routingMode).toBe('HIGH_REASONING');
      expect(threadsRepo.create).toHaveBeenCalledWith({
        userId: 'user-1',
        title: 'Test',
        routingMode: 'HIGH_REASONING',
      });
    });

    it('should create thread without optional fields', async () => {
      threadsRepo.create.mockResolvedValue(mockThread);

      await service.createThread('user-1', {});

      expect(threadsRepo.create).toHaveBeenCalledWith({
        userId: 'user-1',
        title: undefined,
        routingMode: undefined,
      });
    });
  });
});
