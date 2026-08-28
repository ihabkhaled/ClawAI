import { ChatThreadsService } from '../services/chat-threads.service';
import { type ChatThreadsRepository } from '../repositories/chat-threads.repository';
import { type ChatMessagesRepository } from '../../chat-messages/repositories/chat-messages.repository';
import { type RabbitMQService } from '@claw/shared-rabbitmq';
import { SortOrder } from '../../../common/enums';
import { BusinessException, EntityNotFoundException } from '../../../common/errors';
import { type DailyLimitService } from '../../chat-messages/services/daily-limit.service';

const mockThread = {
  id: 'thread-1',
  userId: 'user-1',
  title: 'Test Thread',
  routingMode: 'AUTO' as const,
  lastProvider: null,
  lastModel: null,
  isPinned: false,
  isArchived: false,
  judgeEnabled: false,
  judgeModel: null,
  criticEnabled: false,
  criticModel: null,
  createdAt: new Date(),
  updatedAt: new Date(),
};

const mockThreadWithCount = {
  ...mockThread,
  _count: { messages: 5 },
};

const mockThreadsRepository = (): Record<keyof ChatThreadsRepository, jest.Mock> => ({
  create: jest.fn(),
  createWithinDailyLimit: jest.fn(),
  createBranchWithinDailyLimit: jest.fn(),
  findById: jest.fn(),
  findAll: jest.fn(),
  update: jest.fn(),
  delete: jest.fn(),
  countAll: jest.fn(),
});

const mockMessagesRepository = (): Partial<Record<keyof ChatMessagesRepository, jest.Mock>> => ({
  deleteByThreadId: jest.fn().mockResolvedValue(0),
  findById: jest.fn(),
});

const mockRabbitMQ = (): Partial<Record<keyof RabbitMQService, jest.Mock>> => ({
  publish: jest.fn().mockResolvedValue(void 0),
});

describe('ChatThreadsService', () => {
  let service: ChatThreadsService;
  let threadsRepo: ReturnType<typeof mockThreadsRepository>;
  let messagesRepo: ReturnType<typeof mockMessagesRepository>;
  let rabbitMQ: ReturnType<typeof mockRabbitMQ>;

  beforeEach(() => {
    threadsRepo = mockThreadsRepository();
    threadsRepo.createWithinDailyLimit.mockResolvedValue(mockThread);
    messagesRepo = mockMessagesRepository();
    rabbitMQ = mockRabbitMQ();
    service = new ChatThreadsService(
      threadsRepo as unknown as ChatThreadsRepository,
      messagesRepo as unknown as ChatMessagesRepository,
      rabbitMQ as unknown as RabbitMQService,
      {
        resolve: jest
          .fn()
          .mockResolvedValue({ isAdmin: false, plan: { limits: { chatsPerDay: 2 } } }),
      } as unknown as DailyLimitService,
    );
  });

  describe('createThread', () => {
    it('should create a thread and publish event', async () => {
      threadsRepo.createWithinDailyLimit.mockResolvedValue(mockThread);

      const result = await service.createThread('user-1', { title: 'Test Thread' });

      expect(result).toEqual(mockThread);
      expect(threadsRepo.createWithinDailyLimit).toHaveBeenCalledWith(
        {
          userId: 'user-1',
          title: 'Test Thread',
          routingMode: undefined,
        },
        2,
      );
      expect(rabbitMQ.publish).toHaveBeenCalledWith(
        'thread.created',
        expect.objectContaining({
          threadId: 'thread-1',
          userId: 'user-1',
        }),
      );
    });

    it('rejects creation when the atomic daily thread limit is exhausted', async () => {
      threadsRepo.createWithinDailyLimit.mockResolvedValue(null);

      await expect(service.createThread('user-1', { title: 'Blocked' })).rejects.toMatchObject({
        code: 'PLAN_DAILY_CHAT_LIMIT_EXCEEDED',
        status: 429,
      });
      expect(rabbitMQ.publish).not.toHaveBeenCalled();
    });
  });

  describe('branchThread', () => {
    const pivot = {
      id: 'msg-3',
      threadId: 'thread-1',
      createdAt: new Date('2026-08-28T00:00:00Z'),
    };

    beforeEach(() => {
      threadsRepo.findById.mockResolvedValue(mockThread);
      messagesRepo.findById!.mockResolvedValue(pivot);
      threadsRepo.createBranchWithinDailyLimit.mockResolvedValue({
        ...mockThread,
        id: 'thread-branch',
      });
    });

    it('copies the conversation up to the chosen message', async () => {
      const result = await service.branchThread('user-1', 'thread-1', 'msg-3');

      expect(result.id).toBe('thread-branch');
      expect(threadsRepo.createBranchWithinDailyLimit).toHaveBeenCalledWith(
        expect.objectContaining({ userId: 'user-1' }),
        2,
        'thread-1',
        pivot.createdAt,
      );
    });

    it('counts the branch against the daily chat ceiling', async () => {
      // A branch is a thread. Exempting it would make branching the way around
      // the limit.
      threadsRepo.createBranchWithinDailyLimit.mockResolvedValue(null);

      await expect(service.branchThread('user-1', 'thread-1', 'msg-3')).rejects.toMatchObject({
        code: 'PLAN_DAILY_CHAT_LIMIT_EXCEEDED',
      });
    });

    it('refuses a pivot message from another conversation', async () => {
      // Otherwise one thread's history could be grafted onto another.
      messagesRepo.findById!.mockResolvedValue({ ...pivot, threadId: 'thread-other' });

      await expect(service.branchThread('user-1', 'thread-1', 'msg-3')).rejects.toThrow(
        EntityNotFoundException,
      );
      expect(threadsRepo.createBranchWithinDailyLimit).not.toHaveBeenCalled();
    });

    it('refuses to branch a thread owned by someone else', async () => {
      threadsRepo.findById.mockResolvedValue({ ...mockThread, userId: 'someone-else' });

      await expect(service.branchThread('user-1', 'thread-1', 'msg-3')).rejects.toThrow();
      expect(threadsRepo.createBranchWithinDailyLimit).not.toHaveBeenCalled();
    });

    it('leaves an untitled source branching untitled', async () => {
      // The branch then names itself from its own first message, which is the
      // same message — rather than carrying an empty string across.
      threadsRepo.findById.mockResolvedValue({ ...mockThread, title: null });

      await service.branchThread('user-1', 'thread-1', 'msg-3');

      const [data] = threadsRepo.createBranchWithinDailyLimit.mock.calls[0] ?? [];
      expect(data).not.toHaveProperty('title');
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
        criticEnabled: false,
        criticModel: null,
      });
    });

    // Regression: the service used to whitelist fields into the repository call
    // and silently drop qualityThreshold/maxReRouteAttempts, so the slider always
    // read back as the 0.4 default no matter how many times the user pressed Save.
    it('should forward qualityThreshold and maxReRouteAttempts to the repository', async () => {
      const updated = { ...mockThread, qualityThreshold: 0.8, maxReRouteAttempts: 4 };
      threadsRepo.findById.mockResolvedValue(mockThread);
      threadsRepo.update.mockResolvedValue(updated);

      const result = await service.updateThread('thread-1', 'user-1', {
        qualityThreshold: 0.8,
        maxReRouteAttempts: 4,
      });

      expect(result.qualityThreshold).toBe(0.8);
      expect(result.maxReRouteAttempts).toBe(4);
      expect(threadsRepo.update).toHaveBeenCalledWith(
        'thread-1',
        expect.objectContaining({ qualityThreshold: 0.8, maxReRouteAttempts: 4 }),
      );
    });

    it('should allow clearing qualityThreshold and maxReRouteAttempts back to null', async () => {
      const updated = { ...mockThread, qualityThreshold: null, maxReRouteAttempts: null };
      threadsRepo.findById.mockResolvedValue(mockThread);
      threadsRepo.update.mockResolvedValue(updated);

      await service.updateThread('thread-1', 'user-1', {
        qualityThreshold: null,
        maxReRouteAttempts: null,
      });

      expect(threadsRepo.update).toHaveBeenCalledWith(
        'thread-1',
        expect.objectContaining({ qualityThreshold: null, maxReRouteAttempts: null }),
      );
    });

    it('should persist critic settings and clear them when judge is disabled', async () => {
      threadsRepo.findById.mockResolvedValue(mockThread);
      threadsRepo.update.mockResolvedValue(mockThread);

      await service.updateThread('thread-1', 'user-1', {
        judgeEnabled: false,
        criticEnabled: true,
        criticModel: 'ANTHROPIC:claude-sonnet-4',
      });

      expect(threadsRepo.update).toHaveBeenCalledWith(
        'thread-1',
        expect.objectContaining({
          judgeEnabled: false,
          criticEnabled: false,
          criticModel: null,
        }),
      );
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
        criticEnabled: false,
        criticModel: null,
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
      threadsRepo.createWithinDailyLimit.mockResolvedValue(threadWithMode);

      const result = await service.createThread('user-1', {
        title: 'Test',
        routingMode: 'HIGH_REASONING' as const,
      });

      expect(result.routingMode).toBe('HIGH_REASONING');
      expect(threadsRepo.createWithinDailyLimit).toHaveBeenCalledWith(
        {
          userId: 'user-1',
          title: 'Test',
          routingMode: 'HIGH_REASONING',
        },
        2,
      );
    });

    it('should create thread without optional fields', async () => {
      threadsRepo.createWithinDailyLimit.mockResolvedValue(mockThread);

      await service.createThread('user-1', {});

      expect(threadsRepo.createWithinDailyLimit).toHaveBeenCalledWith(
        {
          userId: 'user-1',
          title: undefined,
          routingMode: undefined,
        },
        2,
      );
    });
  });
});
