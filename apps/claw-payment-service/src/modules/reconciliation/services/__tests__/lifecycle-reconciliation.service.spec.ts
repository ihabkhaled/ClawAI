import { SubscriptionStatus } from '@claw/shared-types';

import {
  ReconciliationClassification,
  ReconciliationResolution,
} from '../../../../common/enums/reconciliation.enum';
import type { SubscriptionLifecycleService } from '../../../billing/services/subscription-lifecycle.service';
import type { SubscriptionRepository } from '../../../subscriptions/repositories/subscription.repository';
import type { ScheduledDowngradeService } from '../../../subscriptions/services/scheduled-downgrade.service';
import type { ReconciliationRepository } from '../../repositories/reconciliation.repository';
import { LifecycleReconciliationService } from '../lifecycle-reconciliation.service';
import type { Subscription } from '../../../../generated/prisma';

const GRACE_DEADLINE = new Date('2026-07-26T12:00:00.000Z');

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
    status: SubscriptionStatus.PAST_DUE,
    billingInterval: 'MONTHLY',
    currency: 'USD',
    amountMinor: 2000,
    currentPeriodStart: new Date('2026-06-26T12:00:00.000Z'),
    currentPeriodEnd: new Date('2026-07-23T12:00:00.000Z'),
    cancelAtPeriodEnd: false,
    cancelledAt: null,
    pastDueAt: new Date('2026-07-23T12:00:00.000Z'),
    gracePeriodEndsAt: GRACE_DEADLINE,
    entitlementValidUntil: GRACE_DEADLINE,
    scheduledPlanId: null,
    scheduledPlanSlug: null,
    scheduledPlanPriceVersionId: null,
    scheduledAmountMinor: null,
    scheduledBillingInterval: null,
    scheduledEffectiveAt: null,
    version: 3,
    uniqueActiveKey: 'user-1',
    createdAt: new Date('2026-06-26T12:00:00.000Z'),
    updatedAt: new Date('2026-07-23T12:00:00.000Z'),
    ...overrides,
  };
}

describe('LifecycleReconciliationService', () => {
  let subscriptions: {
    countGraceExpired: jest.Mock;
    findGraceExpired: jest.Mock;
    countDueScheduledChanges: jest.Mock;
    findDueScheduledChanges: jest.Mock;
  };
  let lifecycle: { expirePastDueIfVersionMatches: jest.Mock };
  let downgrades: { applyDue: jest.Mock };
  let reconciliation: { recordFinding: jest.Mock };
  let service: LifecycleReconciliationService;

  beforeEach(() => {
    subscriptions = {
      countGraceExpired: jest.fn().mockResolvedValue(0),
      findGraceExpired: jest.fn().mockResolvedValue([]),
      countDueScheduledChanges: jest.fn().mockResolvedValue(0),
      findDueScheduledChanges: jest.fn().mockResolvedValue([]),
    };
    lifecycle = { expirePastDueIfVersionMatches: jest.fn().mockResolvedValue(true) };
    downgrades = { applyDue: jest.fn().mockResolvedValue(true) };
    reconciliation = { recordFinding: jest.fn() };
    service = new LifecycleReconciliationService(
      subscriptions as unknown as SubscriptionRepository,
      lifecycle as unknown as SubscriptionLifecycleService,
      downgrades as unknown as ScheduledDowngradeService,
      reconciliation as unknown as ReconciliationRepository,
    );
  });

  it('does not expire grace one second before the boundary', async () => {
    const before = new Date(GRACE_DEADLINE.getTime() - 1000);

    await service.reconcile('run-1', before);

    expect(subscriptions.findGraceExpired).toHaveBeenCalledWith(before, 50);
    expect(lifecycle.expirePastDueIfVersionMatches).not.toHaveBeenCalled();
  });

  it.each([GRACE_DEADLINE, new Date(GRACE_DEADLINE.getTime() + 1000)])(
    'expires grace at and after the inclusive boundary %s',
    async (now) => {
      const candidate = subscription();
      subscriptions.countGraceExpired.mockResolvedValueOnce(1);
      subscriptions.findGraceExpired.mockResolvedValueOnce([candidate]);

      const result = await service.reconcile('run-1', now);

      expect(result.repairedCount).toBe(1);
      expect(lifecycle.expirePastDueIfVersionMatches).toHaveBeenCalledWith(
        candidate.id,
        candidate.userId,
        candidate.version,
        GRACE_DEADLINE,
        now,
        'reconcile:run-1:grace:subscription-1',
      );
      expect(reconciliation.recordFinding).toHaveBeenCalledWith(
        expect.objectContaining({
          classification: ReconciliationClassification.GRACE_PERIOD_EXPIRED,
          resolution: ReconciliationResolution.REPAIRED,
        }),
      );
    },
  );

  it('is idempotent when another owner already repaired the row', async () => {
    subscriptions.countGraceExpired.mockResolvedValueOnce(1);
    subscriptions.findGraceExpired.mockResolvedValueOnce([subscription()]);
    lifecycle.expirePastDueIfVersionMatches.mockResolvedValueOnce(false);

    const result = await service.reconcile('run-1', GRACE_DEADLINE);

    expect(result.repairedCount).toBe(0);
    expect(reconciliation.recordFinding).toHaveBeenCalledWith(
      expect.objectContaining({ resolution: ReconciliationResolution.SUPERSEDED }),
    );
  });

  it('applies a complete due downgrade snapshot', async () => {
    const due = subscription({
      status: SubscriptionStatus.ACTIVE,
      scheduledPlanId: 'plan-starter',
      scheduledPlanSlug: 'starter',
      scheduledPlanPriceVersionId: 'price-starter',
      scheduledAmountMinor: 1000,
      scheduledBillingInterval: 'MONTHLY',
      scheduledEffectiveAt: GRACE_DEADLINE,
    });
    subscriptions.countDueScheduledChanges.mockResolvedValueOnce(1);
    subscriptions.findDueScheduledChanges.mockResolvedValueOnce([due]);

    const result = await service.reconcile('run-1', GRACE_DEADLINE);

    expect(result.repairedCount).toBe(1);
    expect(downgrades.applyDue).toHaveBeenCalledWith(
      due,
      GRACE_DEADLINE,
      'reconcile:run-1:downgrade:subscription-1',
    );
  });

  it('quarantines an old due downgrade with an incomplete price snapshot', async () => {
    const due = subscription({
      status: SubscriptionStatus.ACTIVE,
      scheduledPlanId: 'plan-starter',
      scheduledEffectiveAt: GRACE_DEADLINE,
    });
    subscriptions.countDueScheduledChanges.mockResolvedValueOnce(1);
    subscriptions.findDueScheduledChanges.mockResolvedValueOnce([due]);

    const result = await service.reconcile('run-1', GRACE_DEADLINE);

    expect(result).toMatchObject({ repairedCount: 0, quarantinedCount: 1 });
    expect(downgrades.applyDue).not.toHaveBeenCalled();
    expect(reconciliation.recordFinding).toHaveBeenCalledWith(
      expect.objectContaining({ resolution: ReconciliationResolution.QUARANTINED }),
    );
  });
});
