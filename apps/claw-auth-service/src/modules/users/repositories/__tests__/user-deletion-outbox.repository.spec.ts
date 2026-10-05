import { describe, expect, it, vi } from 'vitest';
import { UserDeletionOutboxRepository } from '../user-deletion-outbox.repository';

describe('UserDeletionOutboxRepository', () => {
  it('deletes sessions and account with a same-transaction outbox record', async () => {
    const calls: string[] = [];
    const tx = {
      session: {
        updateMany: vi.fn(async () => {
          calls.push('sessions');
          return { count: 2 };
        }),
      },
      user: {
        delete: vi.fn(async () => {
          calls.push('user');
          return { id: 'user-private-1' };
        }),
      },
      userDeletionOutboxEvent: {
        create: vi.fn(async ({ data }: { data: Record<string, unknown> }) => {
          calls.push('outbox');
          return data;
        }),
      },
    };
    const prisma = {
      $transaction: vi.fn(async (operation: (client: unknown) => unknown) => operation(tx)),
    };
    const repository = new UserDeletionOutboxRepository(prisma as never);
    const deletedAt = new Date('2026-10-05T12:00:00.000Z');

    await repository.deleteAccount('user-private-1', deletedAt);

    expect(calls).toEqual(['sessions', 'user', 'outbox']);
    const event = tx.userDeletionOutboxEvent.create.mock.calls[0]?.[0].data;
    expect(event?.userId).toBe('user-private-1');
    expect(event?.userIdDigest).toMatch(/^[a-f0-9]{64}$/);
    expect(event?.deletedAt).toEqual(deletedAt);
    expect(prisma.$transaction).toHaveBeenCalledTimes(1);
  });

  it('requeues a failed delivery without recording its error text', async () => {
    const update = vi.fn().mockResolvedValue({});
    const repository = new UserDeletionOutboxRepository({
      userDeletionOutboxEvent: { update },
    } as never);

    await repository.markFailed('event-1', 3, new Date('2026-10-05T12:01:00.000Z'));

    expect(update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          status: 'PENDING',
          attempts: 3,
          lastErrorCode: 'PUBLISH_FAILED',
        }),
      }),
    );
    expect(JSON.stringify(update.mock.calls)).not.toContain('secret');
  });
});
