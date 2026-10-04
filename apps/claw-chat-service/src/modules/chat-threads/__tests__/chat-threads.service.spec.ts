import { type Mock, vi } from 'vitest';
import { ThreadOrigin } from '../../../generated/prisma';
import { ChatThreadsService } from '../services/chat-threads.service';
import { type ChatThreadsRepository } from '../repositories/chat-threads.repository';
import { type ChatMessagesRepository } from '../../chat-messages/repositories/chat-messages.repository';
import { type RabbitMQService } from '@claw/shared-rabbitmq';
import { BranchCut, SortOrder } from '../../../common/enums';
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
  useMemory: false,
  useContext: true,
  useCrossThreadContext: false,
  branchedFromThreadId: null as string | null,
  branchedFromMessageId: null as string | null,
  branchRootThreadId: null as string | null,
  createdAt: new Date(),
  updatedAt: new Date(),
};

const mockThreadWithCount = {
  ...mockThread,
  _count: { messages: 5 },
};

const mockThreadsRepository = (): Record<keyof ChatThreadsRepository, Mock> => ({
  create: vi.fn(),
  createWithinDailyLimit: vi.fn(),
  createBranchWithinDailyLimit: vi.fn(),
  findById: vi.fn(),
  findOwnedSnapshotThread: vi.fn(),
  findLineageEntry: vi.fn(),
  findDirectBranches: vi.fn(),
  findAll: vi.fn(),
  update: vi.fn(),
  delete: vi.fn(),
  countAll: vi.fn(),
});

const mockMessagesRepository = (): Partial<Record<keyof ChatMessagesRepository, Mock>> => ({
  deleteByThreadId: vi.fn().mockResolvedValue(0),
  findById: vi.fn(),
});

const mockRabbitMQ = (): Partial<Record<keyof RabbitMQService, Mock>> => ({
  publish: vi.fn().mockResolvedValue(void 0),
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
        resolve: vi
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

    it('stores the repository reference the client sent (F095)', async () => {
      const repositoryRef = {
        name: 'claw',
        remoteUrl: 'https://github.com/acme/claw',
        branch: 'main',
      };

      await service.createThread('user-1', { title: 'Resume me', repositoryRef });

      const [data] = threadsRepo.createWithinDailyLimit.mock.calls[0] ?? [];
      expect(data).toMatchObject({ userId: 'user-1', repositoryRef });
    });

    it('stores no repository reference when none was sent, so old clients are unchanged', async () => {
      await service.createThread('user-1', { title: 'Plain' });

      const [data] = threadsRepo.createWithinDailyLimit.mock.calls[0] ?? [];
      expect((data as Record<string, unknown>)['repositoryRef']).toBeUndefined();
    });

    it('persists useMemory, useContext and useCrossThreadContext sent on create', async () => {
      await service.createThread('user-1', {
        title: 'Memory off',
        useMemory: false,
        useContext: false,
        useCrossThreadContext: true,
      });

      const [data] = threadsRepo.createWithinDailyLimit.mock.calls[0] ?? [];
      expect(data).toMatchObject({
        useMemory: false,
        useContext: false,
        useCrossThreadContext: true,
      });
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
        true,
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

  describe('branchThread lineage', () => {
    const pivot = { id: 'msg-3', threadId: 'thread-1', createdAt: new Date('2026-08-28') };

    beforeEach(() => {
      messagesRepo.findById!.mockResolvedValue(pivot);
      threadsRepo.createBranchWithinDailyLimit.mockResolvedValue({ ...mockThread, id: 'b' });
    });

    it('records the source thread, the fork message and the source as root', async () => {
      threadsRepo.findById.mockResolvedValue(mockThread);

      await service.branchThread('user-1', 'thread-1', 'msg-3');

      const [data] = threadsRepo.createBranchWithinDailyLimit.mock.calls[0] ?? [];
      expect(data).toMatchObject({
        branchedFromThreadId: 'thread-1',
        branchedFromMessageId: 'msg-3',
        branchRootThreadId: 'thread-1',
      });
    });

    it('keeps the family root when branching a branch', async () => {
      // Grandchildren must share the root, or family exclusion misses them.
      threadsRepo.findById.mockResolvedValue({
        ...mockThread,
        branchedFromThreadId: 'thread-0',
        branchRootThreadId: 'thread-0',
      });

      await service.branchThread('user-1', 'thread-1', 'msg-3');

      const [data] = threadsRepo.createBranchWithinDailyLimit.mock.calls[0] ?? [];
      expect(data).toMatchObject({
        branchedFromThreadId: 'thread-1',
        branchRootThreadId: 'thread-0',
      });
    });

    it('cuts before the pivot when asked, keeping it by default', async () => {
      threadsRepo.findById.mockResolvedValue(mockThread);

      await service.branchThread('user-1', 'thread-1', 'msg-3');
      await service.branchThread('user-1', 'thread-1', 'msg-3', BranchCut.BEFORE);

      expect(threadsRepo.createBranchWithinDailyLimit.mock.calls[0]?.[4]).toBe(true);
      expect(threadsRepo.createBranchWithinDailyLimit.mock.calls[1]?.[4]).toBe(false);
    });

    it('carries the source repository reference onto the branch (F095)', async () => {
      const repositoryRef = { name: 'claw', branch: 'main' };
      threadsRepo.findById.mockResolvedValue({ ...mockThread, repositoryRef });

      await service.branchThread('user-1', 'thread-1', 'msg-3');

      const [data] = threadsRepo.createBranchWithinDailyLimit.mock.calls[0] ?? [];
      expect(data).toMatchObject({ repositoryRef });
    });

    it('carries the source privacy switches instead of resetting them to defaults', async () => {
      threadsRepo.findById.mockResolvedValue(mockThread);

      await service.branchThread('user-1', 'thread-1', 'msg-3');

      const [data] = threadsRepo.createBranchWithinDailyLimit.mock.calls[0] ?? [];
      expect(data).toMatchObject({
        useMemory: false,
        useContext: true,
        useCrossThreadContext: false,
      });
    });
  });

  describe('getLineage', () => {
    const entry = (id: string) => ({
      id,
      title: id,
      createdAt: new Date('2026-09-01'),
      branchedFromMessageId: null,
    });

    it('returns the source, the fork message and the direct branches', async () => {
      threadsRepo.findById.mockResolvedValue({
        ...mockThread,
        branchedFromThreadId: 'thread-0',
        branchedFromMessageId: 'msg-9',
      });
      threadsRepo.findLineageEntry.mockResolvedValue(entry('thread-0'));
      threadsRepo.findDirectBranches.mockResolvedValue([entry('thread-2')]);

      const lineage = await service.getLineage('thread-1', 'user-1');

      expect(lineage).toEqual({
        threadId: 'thread-1',
        parent: entry('thread-0'),
        parentDeleted: false,
        forkMessageId: 'msg-9',
        branches: [entry('thread-2')],
      });
      expect(threadsRepo.findLineageEntry).toHaveBeenCalledWith('user-1', 'thread-0');
      expect(threadsRepo.findDirectBranches).toHaveBeenCalledWith('user-1', 'thread-1');
    });

    it('says the source is gone rather than pretending the thread is a root', async () => {
      threadsRepo.findById.mockResolvedValue({ ...mockThread, branchedFromThreadId: 'deleted' });
      threadsRepo.findLineageEntry.mockResolvedValue(null);
      threadsRepo.findDirectBranches.mockResolvedValue([]);

      const lineage = await service.getLineage('thread-1', 'user-1');

      expect(lineage.parent).toBeNull();
      expect(lineage.parentDeleted).toBe(true);
    });

    it('does not look up a parent for a root thread', async () => {
      threadsRepo.findById.mockResolvedValue(mockThread);
      threadsRepo.findDirectBranches.mockResolvedValue([]);

      const lineage = await service.getLineage('thread-1', 'user-1');

      expect(lineage.parentDeleted).toBe(false);
      expect(threadsRepo.findLineageEntry).not.toHaveBeenCalled();
    });

    it("refuses another user's thread before reading any lineage (IDOR)", async () => {
      threadsRepo.findById.mockResolvedValue({ ...mockThread, userId: 'someone-else' });

      await expect(service.getLineage('thread-1', 'user-1')).rejects.toThrow();
      expect(threadsRepo.findDirectBranches).not.toHaveBeenCalled();
      expect(threadsRepo.findLineageEntry).not.toHaveBeenCalled();
    });

    it('404s an unknown thread', async () => {
      threadsRepo.findById.mockResolvedValue(null);

      await expect(service.getLineage('nope', 'user-1')).rejects.toThrow(EntityNotFoundException);
    });
  });

  describe('getThreads', () => {
    it('should return paginated threads', async () => {
      threadsRepo.findAll.mockResolvedValue([mockThreadWithCount]);
      threadsRepo.countAll.mockResolvedValue(1);

      const result = await service.getThreads('user-1', {
        page: 1,
        limit: 20,
        origin: ThreadOrigin.WEB,
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
        origin: ThreadOrigin.WEB,
        sortBy: 'updatedAt',
        sortOrder: SortOrder.DESC,
      });

      expect(threadsRepo.findAll).toHaveBeenCalledWith(
        {
          userId: 'user-1',
          origin: ThreadOrigin.WEB,
          search: 'test',
          isPinned: true,
          isArchived: undefined,
        },
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
        origin: ThreadOrigin.WEB,
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
        origin: ThreadOrigin.WEB,
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
