import { Prisma } from '../../../../generated/prisma';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { ChatThreadsRepository } from '../chat-threads.repository';

describe('ChatThreadsRepository.findOwnedSnapshotThread', () => {
  afterEach(() => vi.restoreAllMocks());

  it('reads the owner-matched thread and ordered allow-listed messages in one serializable transaction', async () => {
    const transaction = {
      chatThread: {
        findFirst: vi
          .fn()
          .mockResolvedValue({ id: 'thread-1', title: 'Title', createdAt: new Date() }),
      },
      chatMessage: { findMany: vi.fn().mockResolvedValue([]) },
    };
    const prisma = {
      $transaction: vi.fn(
        async (callback: (tx: typeof transaction) => unknown, options: unknown) => {
          expect(options).toEqual({
            isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
          });
          return callback(transaction);
        },
      ),
    };
    const repository = new ChatThreadsRepository(prisma as never);

    await repository.findOwnedSnapshotThread('owner-1', 'thread-1', 2001);

    expect(transaction.chatThread.findFirst).toHaveBeenCalledWith({
      where: { id: 'thread-1', userId: 'owner-1' },
      select: { id: true, title: true, createdAt: true },
    });
    expect(transaction.chatMessage.findMany).toHaveBeenCalledWith({
      where: { threadId: 'thread-1' },
      select: { id: true, role: true, content: true, createdAt: true, metadata: true },
      orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
      take: 2001,
    });
  });

  it('does not read messages when the requested owner does not own the thread', async () => {
    const transaction = {
      chatThread: { findFirst: vi.fn().mockResolvedValue(null) },
      chatMessage: { findMany: vi.fn() },
    };
    const prisma = {
      $transaction: vi.fn(async (callback: (tx: typeof transaction) => unknown) =>
        callback(transaction),
      ),
    };
    const repository = new ChatThreadsRepository(prisma as never);

    await expect(
      repository.findOwnedSnapshotThread('owner-2', 'thread-1', 2001),
    ).resolves.toBeNull();
    expect(transaction.chatMessage.findMany).not.toHaveBeenCalled();
  });
});
