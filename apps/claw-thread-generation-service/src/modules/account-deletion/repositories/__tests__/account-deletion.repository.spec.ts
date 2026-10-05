import { describe, expect, it, vi } from 'vitest';
import { AccountDeletionRepository } from '../account-deletion.repository';

describe('Thread Generation AccountDeletionRepository', () => {
  it('stores only a digest tombstone and erases all account generation jobs', async () => {
    const transaction = {
      threadDeletedAccount: { createMany: vi.fn().mockResolvedValue({ count: 1 }) },
      threadGenerationJob: { deleteMany: vi.fn().mockResolvedValue({ count: 2 }) },
    };
    const prisma = {
      $transaction: vi.fn(async (operation: (client: unknown) => unknown) =>
        operation(transaction),
      ),
    };
    const repository = new AccountDeletionRepository(prisma as never);

    await expect(
      repository.applyDeletion('account-private-1', 'event-1', new Date()),
    ).resolves.toBe(true);

    const tombstone = transaction.threadDeletedAccount.createMany.mock.calls[0]?.[0];
    expect(tombstone?.data[0].accountHash).toMatch(/^[a-f0-9]{64}$/);
    expect(tombstone?.data[0].accountHash).not.toBe('account-private-1');
    expect(transaction.threadGenerationJob.deleteMany).toHaveBeenCalledWith({
      where: { ownerId: 'account-private-1' },
    });
  });

  it('does not repeat cascading erasure for a duplicate event', async () => {
    const transaction = {
      threadDeletedAccount: { createMany: vi.fn().mockResolvedValue({ count: 0 }) },
      threadGenerationJob: { deleteMany: vi.fn() },
    };
    const prisma = {
      $transaction: vi.fn(async (operation: (client: unknown) => unknown) =>
        operation(transaction),
      ),
    };
    const repository = new AccountDeletionRepository(prisma as never);

    await expect(
      repository.applyDeletion('account-private-1', 'event-1', new Date()),
    ).resolves.toBe(false);
    expect(transaction.threadGenerationJob.deleteMany).not.toHaveBeenCalled();
  });
});
