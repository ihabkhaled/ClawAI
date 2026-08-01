import type { Subscription } from '../../../../generated/prisma';
import type { PlanCatalogClient } from '../../../plan-catalog/plan-catalog.client';
import type { SubscriptionRepository } from '../../../subscriptions/repositories/subscription.repository';
import { ScheduledPlanChangeReason } from '../../../subscriptions/enums/scheduled-plan-change-reason.enum';
import type { PlanRetirementClient } from '../../clients/plan-retirement.client';
import { PlanRetirementMigrationStatus } from '../../enums/plan-retirement-migration-status.enum';
import { PlanRetirementReconciliationService } from '../plan-retirement-reconciliation.service';

function subscription(overrides: Partial<Subscription> = {}): Subscription {
  return {
    id: 'subscription-1',
    userId: 'user-1',
    billingCustomerId: 'customer-1',
    planId: 'plan-old',
    planSlug: 'old',
    planPriceVersionId: 'price-old',
    gateway: 'PAYPAL',
    encryptedGatewaySubscriptionId: null,
    encryptionKeyVersion: 1,
    gatewaySubscriptionLookupHash: null,
    status: 'ACTIVE',
    billingInterval: 'MONTHLY',
    currency: 'USD',
    amountMinor: 1000,
    currentPeriodStart: new Date('2026-08-01T00:00:00.000Z'),
    currentPeriodEnd: new Date('2026-09-01T00:00:00.000Z'),
    cancelAtPeriodEnd: false,
    cancelledAt: null,
    pastDueAt: null,
    gracePeriodEndsAt: null,
    entitlementValidUntil: new Date('2026-09-01T00:00:00.000Z'),
    scheduledPlanId: null,
    scheduledPlanSlug: null,
    scheduledPlanPriceVersionId: null,
    scheduledAmountMinor: null,
    scheduledBillingInterval: null,
    scheduledEffectiveAt: null,
    scheduledChangeReason: null,
    version: 3,
    uniqueActiveKey: 'user-1',
    createdAt: new Date('2026-08-01T00:00:00.000Z'),
    updatedAt: new Date('2026-08-01T00:00:00.000Z'),
    ...overrides,
  };
}

const MIGRATION = {
  id: 'migration-1',
  userId: 'user-1',
  sourcePlanId: 'plan-old',
  replacementPlanId: 'plan-new',
  replacementPlanSlug: 'new',
  sourceSubscriptionId: 'subscription-1',
};

describe('PlanRetirementReconciliationService', () => {
  let client: { listPending: jest.Mock; recordOutcome: jest.Mock };
  let subscriptions: { findById: jest.Mock; schedulePlanRetirementIfUnchanged: jest.Mock };
  let catalog: { requireActivePrice: jest.Mock; requirePriceVersion: jest.Mock };
  let service: PlanRetirementReconciliationService;

  beforeEach(() => {
    client = {
      listPending: jest.fn().mockResolvedValue([MIGRATION]),
      recordOutcome: jest.fn().mockResolvedValue(true),
    };
    subscriptions = {
      findById: jest.fn().mockResolvedValue(subscription()),
      schedulePlanRetirementIfUnchanged: jest.fn().mockResolvedValue(true),
    };
    catalog = {
      requireActivePrice: jest.fn().mockResolvedValue({
        id: 'price-new',
        planId: 'plan-new',
        billingInterval: 'MONTHLY',
        currency: 'USD',
        amountMinor: 2000,
        version: 1,
        isActive: true,
      }),
      requirePriceVersion: jest.fn().mockResolvedValue({
        id: 'price-new',
        planId: 'plan-new',
        billingInterval: 'MONTHLY',
        currency: 'USD',
        amountMinor: 2000,
        version: 1,
        isActive: false,
      }),
    };
    service = new PlanRetirementReconciliationService(
      client as unknown as PlanRetirementClient,
      subscriptions as unknown as SubscriptionRepository,
      catalog as unknown as PlanCatalogClient,
    );
  });

  it('freezes the replacement price at period end without charging now', async () => {
    await expect(service.reconcile()).resolves.toEqual({
      scannedCount: 1,
      repairedCount: 1,
      quarantinedCount: 0,
      unprocessedCount: 0,
    });
    expect(subscriptions.schedulePlanRetirementIfUnchanged).toHaveBeenCalledWith({
      subscriptionId: 'subscription-1',
      expectedVersion: 3,
      replacementPlanId: 'plan-new',
      replacementPlanSlug: 'new',
      replacementPlanPriceVersionId: 'price-new',
      replacementAmountMinor: 2000,
      billingInterval: 'MONTHLY',
      effectiveAt: new Date('2026-09-01T00:00:00.000Z'),
      reason: ScheduledPlanChangeReason.PLAN_RETIREMENT,
    });
    expect(client.recordOutcome).toHaveBeenCalledWith(
      'migration-1',
      PlanRetirementMigrationStatus.BILLING_SCHEDULED,
    );
  });

  it.each([
    ['missing subscription', null],
    ['different user', subscription({ userId: 'user-2' })],
    ['different source plan', subscription({ planId: 'plan-other' })],
  ])('marks %s as superseded', async (_label, current) => {
    subscriptions.findById.mockResolvedValueOnce(current);
    await service.reconcile();
    expect(subscriptions.schedulePlanRetirementIfUnchanged).not.toHaveBeenCalled();
    expect(client.recordOutcome).toHaveBeenCalledWith(
      'migration-1',
      PlanRetirementMigrationStatus.SUPERSEDED,
    );
  });

  it('preserves a user-scheduled plan override', async () => {
    subscriptions.findById.mockResolvedValueOnce(
      subscription({ scheduledPlanId: 'plan-user-choice' }),
    );
    await service.reconcile();
    expect(catalog.requireActivePrice).not.toHaveBeenCalled();
    expect(client.recordOutcome).toHaveBeenCalledWith(
      'migration-1',
      PlanRetirementMigrationStatus.SUPERSEDED,
    );
  });

  it('replays a committed retirement schedule after outcome reporting was interrupted', async () => {
    subscriptions.findById.mockResolvedValueOnce(
      subscription({
        scheduledPlanId: 'plan-new',
        scheduledPlanSlug: 'new',
        scheduledPlanPriceVersionId: 'price-new',
        scheduledAmountMinor: 2000,
        scheduledBillingInterval: 'MONTHLY',
        scheduledEffectiveAt: new Date('2026-09-01T00:00:00.000Z'),
        scheduledChangeReason: ScheduledPlanChangeReason.PLAN_RETIREMENT,
      }),
    );

    await service.reconcile();
    expect(subscriptions.schedulePlanRetirementIfUnchanged).not.toHaveBeenCalled();
    expect(client.recordOutcome).toHaveBeenCalledWith(
      'migration-1',
      PlanRetirementMigrationStatus.BILLING_SCHEDULED,
    );
  });

  it('replays a frozen retirement schedule after the active replacement price changes', async () => {
    subscriptions.findById.mockResolvedValueOnce(
      subscription({
        scheduledPlanId: 'plan-new',
        scheduledPlanSlug: 'new',
        scheduledPlanPriceVersionId: 'price-new',
        scheduledAmountMinor: 2000,
        scheduledBillingInterval: 'MONTHLY',
        scheduledEffectiveAt: new Date('2026-09-01T00:00:00.000Z'),
        scheduledChangeReason: ScheduledPlanChangeReason.PLAN_RETIREMENT,
      }),
    );
    catalog.requireActivePrice.mockResolvedValueOnce({
      id: 'price-newer',
      planId: 'plan-new',
      billingInterval: 'MONTHLY',
      currency: 'USD',
      amountMinor: 3000,
      version: 2,
      isActive: true,
    });

    await expect(service.reconcile()).resolves.toEqual({
      scannedCount: 1,
      repairedCount: 1,
      quarantinedCount: 0,
      unprocessedCount: 0,
    });
    expect(catalog.requireActivePrice).not.toHaveBeenCalled();
    expect(catalog.requirePriceVersion).toHaveBeenCalledWith('price-new');
    expect(client.recordOutcome).toHaveBeenCalledWith(
      'migration-1',
      PlanRetirementMigrationStatus.BILLING_SCHEDULED,
    );
  });

  it('leaves an unexplained optimistic-concurrency loss pending for retry', async () => {
    subscriptions.schedulePlanRetirementIfUnchanged.mockResolvedValueOnce(false);
    await expect(service.reconcile()).resolves.toEqual({
      scannedCount: 1,
      repairedCount: 0,
      quarantinedCount: 0,
      unprocessedCount: 1,
    });
    expect(client.recordOutcome).not.toHaveBeenCalled();
  });

  it('recognizes the exact retirement schedule committed during a concurrency race', async () => {
    subscriptions.schedulePlanRetirementIfUnchanged.mockResolvedValueOnce(false);
    subscriptions.findById.mockResolvedValueOnce(subscription()).mockResolvedValueOnce(
      subscription({
        version: 4,
        scheduledPlanId: 'plan-new',
        scheduledPlanSlug: 'new',
        scheduledPlanPriceVersionId: 'price-new',
        scheduledAmountMinor: 2000,
        scheduledBillingInterval: 'MONTHLY',
        scheduledEffectiveAt: new Date('2026-09-01T00:00:00.000Z'),
        scheduledChangeReason: ScheduledPlanChangeReason.PLAN_RETIREMENT,
      }),
    );

    await expect(service.reconcile()).resolves.toEqual({
      scannedCount: 1,
      repairedCount: 1,
      quarantinedCount: 0,
      unprocessedCount: 0,
    });
    expect(client.recordOutcome).toHaveBeenCalledWith(
      'migration-1',
      PlanRetirementMigrationStatus.BILLING_SCHEDULED,
    );
  });

  it('leaves a catalog outage pending for a later reconciliation run', async () => {
    catalog.requireActivePrice.mockRejectedValueOnce(new Error('sensitive provider detail'));
    await expect(service.reconcile()).resolves.toEqual({
      scannedCount: 1,
      repairedCount: 0,
      quarantinedCount: 0,
      unprocessedCount: 1,
    });
    expect(client.recordOutcome).not.toHaveBeenCalled();
  });

  it('leaves a subscription database read outage pending for retry', async () => {
    subscriptions.findById.mockRejectedValueOnce(new Error('database unavailable'));
    await expect(service.reconcile()).resolves.toEqual({
      scannedCount: 1,
      repairedCount: 0,
      quarantinedCount: 0,
      unprocessedCount: 1,
    });
    expect(client.recordOutcome).not.toHaveBeenCalled();
  });

  it('leaves a scheduling database write outage pending for retry', async () => {
    subscriptions.schedulePlanRetirementIfUnchanged.mockRejectedValueOnce(
      new Error('database unavailable'),
    );
    await expect(service.reconcile()).resolves.toEqual({
      scannedCount: 1,
      repairedCount: 0,
      quarantinedCount: 0,
      unprocessedCount: 1,
    });
    expect(client.recordOutcome).not.toHaveBeenCalled();
  });

  it('retries outcome reporting after a committed schedule without marking it failed', async () => {
    const committedSchedule = subscription({
      scheduledPlanId: 'plan-new',
      scheduledPlanSlug: 'new',
      scheduledPlanPriceVersionId: 'price-new',
      scheduledAmountMinor: 2000,
      scheduledBillingInterval: 'MONTHLY',
      scheduledEffectiveAt: new Date('2026-09-01T00:00:00.000Z'),
      scheduledChangeReason: ScheduledPlanChangeReason.PLAN_RETIREMENT,
    });
    subscriptions.findById
      .mockResolvedValueOnce(subscription())
      .mockResolvedValueOnce(committedSchedule);
    client.recordOutcome.mockRejectedValueOnce(new Error('auth unavailable'));

    await expect(service.reconcile()).resolves.toEqual({
      scannedCount: 1,
      repairedCount: 0,
      quarantinedCount: 0,
      unprocessedCount: 1,
    });
    await expect(service.reconcile()).resolves.toEqual({
      scannedCount: 1,
      repairedCount: 1,
      quarantinedCount: 0,
      unprocessedCount: 0,
    });
    expect(client.recordOutcome).toHaveBeenCalledTimes(2);
    expect(client.recordOutcome).toHaveBeenNthCalledWith(
      1,
      'migration-1',
      PlanRetirementMigrationStatus.BILLING_SCHEDULED,
    );
    expect(client.recordOutcome).toHaveBeenNthCalledWith(
      2,
      'migration-1',
      PlanRetirementMigrationStatus.BILLING_SCHEDULED,
    );
  });
});
