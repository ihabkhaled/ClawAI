import { type Mock, vi } from 'vitest';
import { ChatMessagesRepository } from '../chat-messages.repository';

import type { PrismaService } from '../../../../infrastructure/database/prisma/prisma.service';

function build(pivot: { createdAt: Date } | null): {
  repository: ChatMessagesRepository;
  findFirst: Mock;
  deleteMany: Mock;
  transactionRun: Mock;
} {
  const findFirst = vi.fn().mockResolvedValue(pivot);
  const deleteMany = vi.fn().mockResolvedValue({ count: 4 });
  const transactionRun = vi.fn(async (run: (tx: unknown) => Promise<unknown>): Promise<unknown> =>
    run({ chatMessage: { findFirst, deleteMany } }),
  );
  const prisma = { $transaction: transactionRun } as unknown as PrismaService;
  return { repository: new ChatMessagesRepository(prisma), findFirst, deleteMany, transactionRun };
}

describe('ChatMessagesRepository.deleteAfterMessage', () => {
  const at = new Date('2026-09-29T10:00:00.000Z');

  it('deletes only rows after the pivot, inside one transaction', async () => {
    const { repository, findFirst, deleteMany, transactionRun } = build({ createdAt: at });

    await expect(repository.deleteAfterMessage('thread-1', 'msg-2')).resolves.toBe(4);
    expect(transactionRun).toHaveBeenCalledTimes(1);
    expect(findFirst).toHaveBeenCalledWith({
      where: { id: 'msg-2', threadId: 'thread-1' },
      select: { createdAt: true },
    });
    expect(deleteMany).toHaveBeenCalledWith({
      where: { threadId: 'thread-1', createdAt: { gt: at } },
    });
  });

  it('answers null and deletes nothing when the pivot is not in the thread', async () => {
    const { repository, deleteMany } = build(null);

    await expect(repository.deleteAfterMessage('thread-1', 'foreign')).resolves.toBeNull();
    expect(deleteMany).not.toHaveBeenCalled();
  });
});
