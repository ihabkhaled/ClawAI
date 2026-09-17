import { vi, type Mock } from 'vitest';
import { BillingErrorCode, EventPattern, SubscriptionStatus } from '@claw/shared-types';

import { SubscriptionCancelService } from '../subscription-cancel.service';
import type { OutboxRepository } from '../../../outbox/repositories/outbox.repository';
import type { PlanCatalogClient } from '../../../plan-catalog/plan-catalog.client';
import type { PrismaService } from '../../../../infrastructure/database/prisma/prisma.service';
import type { SubscriptionRepository } from '../../repositories/subscription.repository';

function makeSubscription(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    id: 'sub-1',
    userId: 'user-1',
    version: 4,
    status: SubscriptionStatus.ACTIVE,
    planId: 'plan-pro',
    planSlug: 'pro',
    planPriceVersionId: 'price-pro-1',
    billingInterval: 'MONTHLY',
    currency: 'USD',
    amountMinor: 1999,
    currentPeriodStart: new Date('2026-07-01T00:00:00.000Z'),
    currentPeriodEnd: new Date('2026-08-01T00:00:00.000Z'),
    cancelAtPeriodEnd: false,
    gracePeriodEndsAt: null,
    scheduledPlanSlug: null,
    scheduledEffectiveAt: null,
    entitlementValidUntil: new Date('2026-08-04T00:00:00.000Z'),
    ...overrides,
  };
}

describe('SubscriptionCancelService', () => {
  let prisma: { $transaction: Mock; subscription: { update: Mock } };
  let subscriptions: { findActiveByUserId: Mock };
  let outbox: { enqueue: Mock };
  let catalog: { listCatalog: Mock };
  let txUpdate: Mock;
  let txUpdateMany: Mock;
  let txFindUnique: Mock;
  let service: SubscriptionCancelService;

  beforeEach(() => {
    txUpdate = vi.fn();
    txUpdateMany = vi.fn();
    txFindUnique = vi.fn();
    prisma = {
      $transaction: vi.fn(
        async (
          fn: (tx: {
            subscription: {
              update: Mock;
              updateMany: Mock;
              findUnique: Mock;
            };
          }) => Promise<unknown>,
        ) =>
          fn({
            subscription: {
              update: txUpdate,
              updateMany: txUpdateMany,
              findUnique: txFindUnique,
            },
          }),
      ),
      subscription: { update: vi.fn() },
    };
    subscriptions = { findActiveByUserId: vi.fn().mockResolvedValue(makeSubscription()) };
    outbox = { enqueue: vi.fn() };
    catalog = { listCatalog: vi.fn().mockResolvedValue([{ id: 'plan-pro', name: 'Pro' }]) };

    service = new SubscriptionCancelService(
      prisma as unknown as PrismaService,
      subscriptions as unknown as SubscriptionRepository,
      outbox as unknown as OutboxRepository,
      catalog as unknown as PlanCatalogClient,
    );
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('cancelAtPeriodEnd', () => {
    it('flips the flag without changing the status', async () => {
      // The status stays entitlement-bearing: the customer paid for this period
      // and keeps it. Only cancelAtPeriodEnd moves, which is also what makes
      // resume a clean reversal rather than a re-purchase.
      txUpdate.mockResolvedValue(makeSubscription({ cancelAtPeriodEnd: true }));

      await service.cancelAtPeriodEnd('user-1');

      const data = txUpdate.mock.calls[0]?.[0] as { data: Record<string, unknown> };
      expect(data.data['cancelAtPeriodEnd']).toBe(true);
      expect(data.data).not.toHaveProperty('status');
    });

    it('tells auth entitlement runs to period end, not that it ended now', async () => {
      txUpdate.mockResolvedValue(makeSubscription({ cancelAtPeriodEnd: true }));

      await service.cancelAtPeriodEnd('user-1');

      const event = outbox.enqueue.mock.calls[0]?.[1] as {
        pattern: string;
        payloadJson: { entitlementValidUntil: string };
      };
      expect(event.pattern).toBe(EventPattern.BILLING_SUBSCRIPTION_CANCELLED);
      expect(event.payloadJson.entitlementValidUntil).toBe('2026-08-01T00:00:00.000Z');
    });

    it('writes the state change and the event in one transaction', async () => {
      // A crash between them would leave auth believing something payment does
      // not, in either direction.
      txUpdate.mockResolvedValue(makeSubscription({ cancelAtPeriodEnd: true }));

      await service.cancelAtPeriodEnd('user-1');

      expect(prisma.$transaction).toHaveBeenCalledTimes(1);
      expect(outbox.enqueue).toHaveBeenCalledTimes(1);
    });

    it('refuses to cancel twice', async () => {
      subscriptions.findActiveByUserId.mockResolvedValue(
        makeSubscription({ cancelAtPeriodEnd: true }),
      );

      await expect(service.cancelAtPeriodEnd('user-1')).rejects.toMatchObject({
        code: BillingErrorCode.SUBSCRIPTION_CHANGE_CONFLICT,
      });
      expect(outbox.enqueue).not.toHaveBeenCalled();
    });

    it('refuses to cancel an already-cancelled subscription', async () => {
      subscriptions.findActiveByUserId.mockResolvedValue(
        makeSubscription({ status: SubscriptionStatus.CANCELLED }),
      );

      await expect(service.cancelAtPeriodEnd('user-1')).rejects.toMatchObject({
        code: BillingErrorCode.SUBSCRIPTION_CHANGE_CONFLICT,
      });
    });

    it('rejects a user with no subscription', async () => {
      subscriptions.findActiveByUserId.mockResolvedValue(null);

      await expect(service.cancelAtPeriodEnd('user-1')).rejects.toMatchObject({
        code: BillingErrorCode.SUBSCRIPTION_NOT_FOUND,
      });
    });
  });

  describe('resume', () => {
    it('clears the cancellation', async () => {
      subscriptions.findActiveByUserId.mockResolvedValue(
        makeSubscription({ cancelAtPeriodEnd: true }),
      );
      prisma.subscription.update.mockResolvedValue(makeSubscription());

      const view = await service.resume('user-1');

      expect(prisma.subscription.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ cancelAtPeriodEnd: false, cancelledAt: null }),
        }),
      );
      expect(view.cancelAtPeriodEnd).toBe(false);
    });

    it('refuses to resume something that was not cancelling', async () => {
      // Silently succeeding would imply a state change the user did not get.
      await expect(service.resume('user-1')).rejects.toMatchObject({
        code: BillingErrorCode.SUBSCRIPTION_CHANGE_CONFLICT,
      });
    });
  });

  describe('endNow', () => {
    it('immediately revokes entitlement but preserves the subscription row', async () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date('2026-07-28T19:30:00.000Z'));
      txUpdateMany.mockResolvedValue({ count: 1 });
      txFindUnique.mockResolvedValue(
        makeSubscription({
          status: SubscriptionStatus.CANCELLED,
          cancelAtPeriodEnd: false,
          cancelledAt: new Date('2026-07-28T19:30:00.000Z'),
          entitlementValidUntil: new Date('2026-07-28T19:30:00.000Z'),
          uniqueActiveKey: null,
          version: 5,
        }),
      );

      const view = await service.endNow('user-1');

      expect(txUpdateMany).toHaveBeenCalledWith({
        where: { id: 'sub-1', version: 4 },
        data: expect.objectContaining({
          status: SubscriptionStatus.CANCELLED,
          cancelAtPeriodEnd: false,
          entitlementValidUntil: new Date('2026-07-28T19:30:00.000Z'),
          uniqueActiveKey: null,
          version: { increment: 1 },
        }),
      });
      expect(txFindUnique).toHaveBeenCalledWith({ where: { id: 'sub-1' } });
      expect(view.status).toBe(SubscriptionStatus.CANCELLED);
    });

    it('publishes immediate revocation in the same transaction', async () => {
      txUpdateMany.mockResolvedValue({ count: 1 });
      txFindUnique.mockResolvedValue(
        makeSubscription({
          status: SubscriptionStatus.CANCELLED,
          entitlementValidUntil: new Date('2026-07-28T19:30:00.000Z'),
        }),
      );

      await service.endNow('user-1');

      const event = outbox.enqueue.mock.calls[0]?.[1] as {
        pattern: string;
        payloadJson: { cancelAtPeriodEnd: boolean; entitlementValidUntil: string };
      };
      expect(prisma.$transaction).toHaveBeenCalledTimes(1);
      expect(event.pattern).toBe(EventPattern.BILLING_SUBSCRIPTION_CANCELLED);
      expect(event.payloadJson.cancelAtPeriodEnd).toBe(false);
      expect(new Date(event.payloadJson.entitlementValidUntil).getTime()).toBeLessThanOrEqual(
        Date.now(),
      );
    });

    it('rejects a concurrent state change rather than overwriting it', async () => {
      txUpdateMany.mockResolvedValue({ count: 0 });

      await expect(service.endNow('user-1')).rejects.toMatchObject({
        code: BillingErrorCode.SUBSCRIPTION_CHANGE_CONFLICT,
      });
      expect(outbox.enqueue).not.toHaveBeenCalled();
    });
  });

  it('still renders when the plan catalog is unreachable', async () => {
    // The display name lives in auth. Losing it must not take the billing page
    // down — the view falls back to the slug.
    catalog.listCatalog.mockRejectedValue(new Error('auth down'));
    txUpdate.mockResolvedValue(makeSubscription({ cancelAtPeriodEnd: true }));

    const view = await service.cancelAtPeriodEnd('user-1');

    expect(view.planName).toBe('pro');
  });
});
