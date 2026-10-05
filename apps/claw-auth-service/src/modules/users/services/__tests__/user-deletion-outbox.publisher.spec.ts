import { describe, expect, it, vi } from 'vitest';
import { EventPattern } from '@claw/shared-types';
import { UserDeletionOutboxPublisher } from '../user-deletion-outbox.publisher';

describe('UserDeletionOutboxPublisher', () => {
  it('publishes the deletion event and marks the outbox row published', async () => {
    const event = {
      id: 'row-1',
      eventId: 'event-1',
      userId: 'user-private-1',
      deletedAt: new Date('2026-10-05T12:00:00.000Z'),
      attempts: 1,
    };
    const repository = {
      recoverStalled: vi.fn(),
      claimBatch: vi.fn().mockResolvedValue([event]),
      markPublished: vi.fn(),
      markFailed: vi.fn(),
    };
    const rabbit = { publish: vi.fn().mockResolvedValue(undefined) };
    const publisher = new UserDeletionOutboxPublisher(repository as never, rabbit as never);

    await publisher.drain();

    expect(rabbit.publish).toHaveBeenCalledWith(EventPattern.USER_DELETED, {
      eventId: 'event-1',
      userId: 'user-private-1',
      deletedAt: event.deletedAt.toISOString(),
      timestamp: event.deletedAt.toISOString(),
    });
    expect(repository.markPublished).toHaveBeenCalledWith('row-1');
    expect(repository.markFailed).not.toHaveBeenCalled();
  });

  it('stores a sanitized retry on broker failure', async () => {
    const event = {
      id: 'row-1',
      eventId: 'event-1',
      userId: 'user-private-1',
      deletedAt: new Date('2026-10-05T12:00:00.000Z'),
      attempts: 2,
    };
    const repository = {
      recoverStalled: vi.fn(),
      claimBatch: vi.fn().mockResolvedValue([event]),
      markPublished: vi.fn(),
      markFailed: vi.fn(),
    };
    const rabbit = { publish: vi.fn().mockRejectedValue(new Error('secret broker detail')) };
    const publisher = new UserDeletionOutboxPublisher(repository as never, rabbit as never);

    await publisher.drain();

    expect(repository.markFailed).toHaveBeenCalledWith('row-1', 2, expect.any(Date));
    expect(repository.markPublished).not.toHaveBeenCalled();
  });
});
