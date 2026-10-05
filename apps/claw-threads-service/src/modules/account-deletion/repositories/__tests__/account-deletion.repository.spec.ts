import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AccountDeletionRepository } from '../account-deletion.repository';

type MockMethod = ReturnType<typeof vi.fn>;
type TransactionMock = {
  threadDeletedAccount: { createMany: MockMethod };
  threadPublication: { findMany: MockMethod; updateMany: MockMethod; deleteMany: MockMethod };
  threadPublicationRevision: { deleteMany: MockMethod };
  threadPublicationComment: { updateMany: MockMethod };
  threadPublicationReaction: { deleteMany: MockMethod };
  threadPublicationChangeRequest: { deleteMany: MockMethod; updateMany: MockMethod };
  threadPublicationReport: { updateMany: MockMethod };
};

describe('Threads AccountDeletionRepository', () => {
  let tx: TransactionMock;
  let repository: AccountDeletionRepository;

  beforeEach(() => {
    tx = {
      threadDeletedAccount: { createMany: vi.fn().mockResolvedValue({ count: 1 }) },
      threadPublication: {
        findMany: vi.fn().mockResolvedValue([{ id: 'pub-public' }]),
        updateMany: vi.fn().mockResolvedValue({ count: 1 }),
        deleteMany: vi.fn().mockResolvedValue({ count: 1 }),
      },
      threadPublicationRevision: { deleteMany: vi.fn().mockResolvedValue({ count: 1 }) },
      threadPublicationComment: { updateMany: vi.fn().mockResolvedValue({ count: 1 }) },
      threadPublicationReaction: { deleteMany: vi.fn().mockResolvedValue({ count: 1 }) },
      threadPublicationChangeRequest: {
        deleteMany: vi.fn().mockResolvedValue({ count: 1 }),
        updateMany: vi.fn().mockResolvedValue({ count: 1 }),
      },
      threadPublicationReport: { updateMany: vi.fn().mockResolvedValue({ count: 1 }) },
    };
    const prisma = {
      $transaction: vi.fn(async (operation: (client: unknown) => unknown) => operation(tx)),
    };
    repository = new AccountDeletionRepository(prisma as never);
  });

  it('keeps approved public work anonymous and erases private account data', async () => {
    await expect(
      repository.applyDeletion('account-private-1', 'event-1', new Date()),
    ).resolves.toBe(true);

    const tombstone = tx.threadDeletedAccount.createMany.mock.calls[0]?.[0];
    expect(tombstone?.data[0].accountHash).toMatch(/^[a-f0-9]{64}$/);
    expect(tombstone?.data[0].accountHash).not.toBe('account-private-1');
    expect(tx.threadPublication.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          ownerId: 'account-private-1',
          status: 'PUBLISHED',
        }),
      }),
    );
    expect(tx.threadPublication.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: { in: ['pub-public'] }, ownerId: 'account-private-1' },
        data: expect.objectContaining({ ownerId: null, generationJobId: null, sourceHash: null }),
      }),
    );
    expect(tx.threadPublicationComment.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { authorId: 'account-private-1' },
        data: { authorId: null },
      }),
    );
    expect(tx.threadPublicationReaction.deleteMany).toHaveBeenCalledWith({
      where: { userId: 'account-private-1' },
    });
    expect(tx.threadPublicationChangeRequest.deleteMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ status: 'PENDING' }) }),
    );
    expect(tx.threadPublicationReport.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        data: { reporterId: null, moderatedBy: null, details: null },
      }),
    );
    expect(tx.threadPublication.deleteMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { ownerId: 'account-private-1', id: { notIn: ['pub-public'] } },
      }),
    );
  });

  it('does not reapply an event already represented by an account tombstone', async () => {
    tx.threadDeletedAccount.createMany.mockResolvedValue({ count: 0 });

    await expect(
      repository.applyDeletion('account-private-1', 'event-1', new Date()),
    ).resolves.toBe(false);
    expect(tx.threadPublication.findMany).not.toHaveBeenCalled();
  });
});
