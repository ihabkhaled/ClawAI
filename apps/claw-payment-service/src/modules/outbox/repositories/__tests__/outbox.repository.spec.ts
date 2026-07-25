import { OutboxEventStatus } from '@claw/shared-types';

import type { PrismaService } from '../../../../infrastructure/database/prisma/prisma.service';
import type { Prisma } from '../../../../generated/prisma';
import { OutboxRepository } from '../outbox.repository';

type OutboxDelegate = {
  create: jest.Mock;
  findMany: jest.Mock;
  update: jest.Mock;
  updateMany: jest.Mock;
  count: jest.Mock;
};

function buildPrisma(): { prisma: PrismaService; outboxEvent: OutboxDelegate } {
  const outboxEvent: OutboxDelegate = {
    create: jest.fn(async (args: unknown) => args),
    findMany: jest.fn(async () => []),
    update: jest.fn(async () => ({ id: 'ob_1' })),
    updateMany: jest.fn(async () => ({ count: 0 })),
    count: jest.fn(async () => 0),
  };
  return { prisma: { outboxEvent } as unknown as PrismaService, outboxEvent };
}

const ENQUEUE = {
  pattern: 'billing.subscription.activated',
  eventId: 'evt_1',
  aggregateType: 'Subscription',
  aggregateId: 'sub_1',
  payloadJson: { userId: 'user_1' } as Prisma.InputJsonValue,
};

describe('OutboxRepository', () => {
  let outboxEvent: OutboxDelegate;
  let repository: OutboxRepository;

  beforeEach(() => {
    const built = buildPrisma();
    outboxEvent = built.outboxEvent;
    repository = new OutboxRepository(built.prisma);
    jest.spyOn(repository['logger'], 'warn').mockImplementation(() => {});
    jest.spyOn(repository['logger'], 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('enqueue', () => {
    it('writes through the CALLER transaction, not a fresh connection', async () => {
      // The whole point of an outbox: the event row commits atomically with the
      // state change it announces, or not at all.
      const txCreate = jest.fn(async (args: unknown) => args);
      const tx = { outboxEvent: { create: txCreate } } as unknown as Prisma.TransactionClient;

      await repository.enqueue(tx, ENQUEUE);

      expect(txCreate).toHaveBeenCalledWith({
        data: expect.objectContaining({
          eventId: 'evt_1',
          status: OutboxEventStatus.PENDING,
        }),
      });
      expect(outboxEvent.create).not.toHaveBeenCalled();
    });
  });

  describe('claimBatch', () => {
    it('returns an empty batch without writing when nothing is pending', async () => {
      outboxEvent.findMany.mockResolvedValueOnce([]);
      await expect(repository.claimBatch(10, new Date())).resolves.toEqual([]);
      expect(outboxEvent.updateMany).not.toHaveBeenCalled();
    });

    it('flips claimed rows to PUBLISHING so a second poller cannot take them', async () => {
      outboxEvent.findMany.mockResolvedValueOnce([{ id: 'ob_1' }, { id: 'ob_2' }]);
      outboxEvent.findMany.mockResolvedValueOnce([{ id: 'ob_1' }, { id: 'ob_2' }]);

      await repository.claimBatch(10, new Date('2026-07-25T00:00:00.000Z'));

      expect(outboxEvent.updateMany).toHaveBeenCalledWith({
        where: { id: { in: ['ob_1', 'ob_2'] }, status: OutboxEventStatus.PENDING },
        data: { status: OutboxEventStatus.PUBLISHING, attempts: { increment: 1 } },
      });
    });

    it('only claims rows whose backoff has elapsed', async () => {
      const now = new Date('2026-07-25T00:00:00.000Z');
      await repository.claimBatch(5, now);
      expect(outboxEvent.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { status: OutboxEventStatus.PENDING, availableAt: { lte: now } },
          take: 5,
        }),
      );
    });
  });

  describe('markFailed', () => {
    it('returns the row to PENDING with a backoff while attempts remain', async () => {
      const retryAt = new Date('2026-07-25T00:05:00.000Z');
      await repository.markFailed('ob_1', 3, 10, retryAt, 'BROKER_UNAVAILABLE');
      expect(outboxEvent.update).toHaveBeenCalledWith({
        where: { id: 'ob_1' },
        data: {
          status: OutboxEventStatus.PENDING,
          availableAt: retryAt,
          lastErrorCode: 'BROKER_UNAVAILABLE',
        },
      });
    });

    it('dead-letters once the attempt ceiling is reached instead of retrying forever', async () => {
      await repository.markFailed('ob_1', 10, 10, new Date(), 'BROKER_UNAVAILABLE');
      const call = outboxEvent.update.mock.calls[0]?.[0] as { data: Record<string, unknown> };
      expect(call.data['status']).toBe(OutboxEventStatus.DEAD_LETTERED);
    });

    it('dead-letters when attempts have overshot the ceiling', async () => {
      await repository.markFailed('ob_1', 11, 10, new Date(), 'X');
      const call = outboxEvent.update.mock.calls[0]?.[0] as { data: Record<string, unknown> };
      expect(call.data['status']).toBe(OutboxEventStatus.DEAD_LETTERED);
    });
  });

  describe('recoverStalled', () => {
    it('returns rows abandoned by a dead replica to PENDING', async () => {
      // Safe to republish: the consumer inbox de-duplicates on eventId, so a
      // double publish cannot double-apply.
      outboxEvent.findMany.mockResolvedValueOnce([{ id: 'ob_9' }]);
      outboxEvent.updateMany.mockResolvedValueOnce({ count: 1 });

      await expect(repository.recoverStalled(new Date(), 10)).resolves.toBe(1);
      expect(outboxEvent.updateMany).toHaveBeenCalledWith({
        where: { id: { in: ['ob_9'] } },
        data: { status: OutboxEventStatus.PENDING },
      });
    });

    it('does nothing when no rows are stalled', async () => {
      outboxEvent.findMany.mockResolvedValueOnce([]);
      await expect(repository.recoverStalled(new Date(), 10)).resolves.toBe(0);
      expect(outboxEvent.updateMany).not.toHaveBeenCalled();
    });
  });

  it('marks a published row with its publish time', async () => {
    await repository.markPublished('ob_1');
    expect(outboxEvent.update).toHaveBeenCalledWith({
      where: { id: 'ob_1' },
      data: expect.objectContaining({ status: OutboxEventStatus.PUBLISHED }),
    });
  });

  it('counts by status', async () => {
    await repository.countByStatus(OutboxEventStatus.DEAD_LETTERED);
    expect(outboxEvent.count).toHaveBeenCalledWith({
      where: { status: OutboxEventStatus.DEAD_LETTERED },
    });
  });
});
