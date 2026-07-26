import { EventPattern, SubscriptionStatus } from '@claw/shared-types';

import type { PrismaService } from '../../../../infrastructure/database/prisma/prisma.service';
import type { OutboxRepository } from '../../../outbox/repositories/outbox.repository';
import type { ProrationQuoteView } from '../../../billing/types/proration.types';
import { ScheduledDowngradeService } from '../scheduled-downgrade.service';
import type { Subscription } from '../../../../generated/prisma';

function subscription(overrides: Partial<Subscription> = {}): Subscription {
  return {
    id: 'subscription-1',
    userId: 'user-1',
    billingCustomerId: 'customer-1',
    planId: 'plan-pro',
    planSlug: 'pro',
    planPriceVersionId: 'price-pro',
    gateway: 'PAYPAL',
    encryptedGatewaySubscriptionId: null,
    encryptionKeyVersion: 1,
    gatewaySubscriptionLookupHash: null,
    status: SubscriptionStatus.ACTIVE,
    billingInterval: 'MONTHLY',
    currency: 'USD',
    amountMinor: 2000,
    currentPeriodStart: new Date('2026-07-01T00:00:00.000Z'),
    currentPeriodEnd: new Date('2026-08-01T00:00:00.000Z'),
    cancelAtPeriodEnd: false,
    cancelledAt: null,
    pastDueAt: null,
    gracePeriodEndsAt: null,
    entitlementValidUntil: new Date('2026-08-04T00:00:00.000Z'),
    scheduledPlanId: 'plan-starter',
    scheduledPlanSlug: 'starter',
    scheduledPlanPriceVersionId: 'price-starter',
    scheduledAmountMinor: 1000,
    scheduledBillingInterval: 'MONTHLY',
    scheduledEffectiveAt: new Date('2026-08-01T00:00:00.000Z'),
    version: 4,
    uniqueActiveKey: 'user-1',
    createdAt: new Date('2026-07-01T00:00:00.000Z'),
    updatedAt: new Date('2026-07-15T00:00:00.000Z'),
    ...overrides,
  };
}

function quote(): ProrationQuoteView {
  return {
    quoteId: 'quote-1',
    subscriptionId: 'subscription-1',
    targetPlanId: 'plan-starter',
    targetPlanSlug: 'starter',
    targetPriceVersionId: 'price-starter',
    targetAmountMinor: 1000,
    targetBillingInterval: 'MONTHLY',
    currency: 'USD',
    remainingRatioScaled: 5_000_000,
    unusedCurrentCreditMinor: 1000,
    targetRemainingChargeMinor: 500,
    amountDueMinor: 0,
    isScheduledForPeriodEnd: true,
    scheduledEffectiveAtMs: Date.parse('2026-08-01T00:00:00.000Z'),
    expiresAtMs: Date.parse('2026-07-26T01:00:00.000Z'),
  };
}

describe('ScheduledDowngradeService', () => {
  let update: jest.Mock;
  let updateMany: jest.Mock;
  let outbox: { enqueue: jest.Mock };
  let service: ScheduledDowngradeService;

  beforeEach(() => {
    update = jest.fn();
    updateMany = jest.fn().mockResolvedValue({ count: 1 });
    const transaction = jest.fn(
      async (
        callback: (tx: {
          subscription: { update: jest.Mock; updateMany: jest.Mock };
        }) => Promise<unknown>,
      ) => callback({ subscription: { update, updateMany } }),
    );
    outbox = { enqueue: jest.fn() };
    service = new ScheduledDowngradeService(
      { $transaction: transaction } as unknown as PrismaService,
      outbox as unknown as OutboxRepository,
    );
  });

  it('freezes the target price and interval when scheduling', async () => {
    await service.schedule(
      subscription({
        scheduledPlanId: null,
        scheduledPlanSlug: null,
        scheduledPlanPriceVersionId: null,
        scheduledAmountMinor: null,
        scheduledBillingInterval: null,
        scheduledEffectiveAt: null,
      }),
      quote(),
    );

    expect(update).toHaveBeenCalledWith({
      where: { id: 'subscription-1' },
      data: expect.objectContaining({
        scheduledAmountMinor: 1000,
        scheduledBillingInterval: 'MONTHLY',
      }),
    });
  });

  it('atomically applies a due snapshot and emits a downgrade event', async () => {
    const now = new Date('2026-08-01T00:00:00.000Z');

    await expect(service.applyDue(subscription(), now, 'run-1')).resolves.toBe(true);

    expect(updateMany).toHaveBeenCalledWith({
      where: {
        id: 'subscription-1',
        version: 4,
        scheduledEffectiveAt: { not: null, lte: now },
      },
      data: expect.objectContaining({
        planId: 'plan-starter',
        planSlug: 'starter',
        planPriceVersionId: 'price-starter',
        amountMinor: 1000,
        scheduledPlanId: null,
        scheduledAmountMinor: null,
        version: { increment: 1 },
      }),
    });
    expect(outbox.enqueue).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        pattern: EventPattern.BILLING_SUBSCRIPTION_DOWNGRADED,
        payloadJson: expect.objectContaining({
          planId: 'plan-starter',
          planPriceVersionId: 'price-starter',
        }),
      }),
    );
  });

  it('does not emit twice when the optimistic update loses the race', async () => {
    updateMany.mockResolvedValueOnce({ count: 0 });

    await expect(
      service.applyDue(subscription(), new Date('2026-08-01T00:00:00.000Z'), 'run-1'),
    ).resolves.toBe(false);
    expect(outbox.enqueue).not.toHaveBeenCalled();
  });

  it('quarantines an incomplete scheduled snapshot before opening a transaction', async () => {
    await expect(
      service.applyDue(
        subscription({ scheduledAmountMinor: null }),
        new Date('2026-08-01T00:00:00.000Z'),
        'run-1',
      ),
    ).resolves.toBe(false);
    expect(updateMany).not.toHaveBeenCalled();
    expect(outbox.enqueue).not.toHaveBeenCalled();
  });
});
