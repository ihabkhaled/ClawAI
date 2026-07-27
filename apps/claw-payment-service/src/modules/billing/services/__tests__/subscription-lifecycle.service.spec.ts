import { EventPattern, SubscriptionStatus } from '@claw/shared-types';

import type { PrismaService } from '../../../../infrastructure/database/prisma/prisma.service';
import type { OutboxRepository } from '../../../outbox/repositories/outbox.repository';
import type { BillingRecordService } from '../billing-record.service';
import { SubscriptionLifecycleService } from '../subscription-lifecycle.service';

describe('SubscriptionLifecycleService grace expiry', () => {
  let updateMany: jest.Mock;
  let outbox: { enqueue: jest.Mock };
  let service: SubscriptionLifecycleService;

  beforeEach(() => {
    updateMany = jest.fn().mockResolvedValue({ count: 1 });
    const prisma = {
      $transaction: jest.fn(
        async (callback: (tx: { subscription: { updateMany: jest.Mock } }) => Promise<unknown>) =>
          callback({ subscription: { updateMany } }),
      ),
    };
    outbox = { enqueue: jest.fn() };
    service = new SubscriptionLifecycleService(
      prisma as unknown as PrismaService,
      outbox as unknown as OutboxRepository,
      {} as BillingRecordService,
    );
  });

  it('expires only the exact past-due version at the inclusive deadline', async () => {
    const deadline = new Date('2026-07-26T12:00:00.000Z');

    await expect(
      service.expirePastDueIfVersionMatches(
        'subscription-1',
        'user-1',
        3,
        deadline,
        deadline,
        'run-1',
      ),
    ).resolves.toBe(true);

    expect(updateMany).toHaveBeenCalledWith({
      where: {
        id: 'subscription-1',
        status: SubscriptionStatus.PAST_DUE,
        version: 3,
        gracePeriodEndsAt: { equals: deadline, lte: deadline },
      },
      data: {
        status: SubscriptionStatus.EXPIRED,
        uniqueActiveKey: null,
        version: { increment: 1 },
      },
    });
    expect(outbox.enqueue).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ pattern: EventPattern.BILLING_SUBSCRIPTION_EXPIRED }),
    );
  });

  it('is a no-op when another lock owner already moved the version', async () => {
    updateMany.mockResolvedValueOnce({ count: 0 });

    await expect(
      service.expirePastDueIfVersionMatches(
        'subscription-1',
        'user-1',
        3,
        new Date('2026-07-26T12:00:00.000Z'),
        new Date('2026-07-26T12:00:01.000Z'),
        'run-1',
      ),
    ).resolves.toBe(false);
    expect(outbox.enqueue).not.toHaveBeenCalled();
  });
});
