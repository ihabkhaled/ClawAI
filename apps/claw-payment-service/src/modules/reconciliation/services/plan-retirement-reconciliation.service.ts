import { Injectable, Logger } from '@nestjs/common';

import { PlanCatalogClient } from '../../plan-catalog/plan-catalog.client';
import { ScheduledPlanChangeReason } from '../../subscriptions/enums/scheduled-plan-change-reason.enum';
import { SubscriptionRepository } from '../../subscriptions/repositories/subscription.repository';
import { PlanRetirementClient } from '../clients/plan-retirement.client';
import {
  PLAN_RETIREMENT_FAILURE_CODE,
  RECONCILIATION_BATCH_SIZE,
} from '../constants/reconciliation.constants';
import { PlanRetirementMigrationStatus } from '../enums/plan-retirement-migration-status.enum';
import type { PendingPlanRetirementMigration } from '../types/plan-retirement.types';
import type { ReconciliationCounts } from '../types/reconciliation.types';
import type { PlanPriceVersionView } from '../../plan-catalog/types/plan-catalog.types';
import type { Subscription } from '../../../generated/prisma';

@Injectable()
export class PlanRetirementReconciliationService {
  private readonly logger = new Logger(PlanRetirementReconciliationService.name);

  constructor(
    private readonly client: PlanRetirementClient,
    private readonly subscriptions: SubscriptionRepository,
    private readonly catalog: PlanCatalogClient,
  ) {}

  async reconcile(): Promise<ReconciliationCounts> {
    this.logger.debug('reconcile: polling pending plan retirements');
    const migrations = await this.client.listPending();
    let repairedCount = 0;
    let quarantinedCount = 0;
    let retryableCount = 0;
    for (const migration of migrations) {
      const status = await this.processSafely(migration);
      repairedCount += status === PlanRetirementMigrationStatus.BILLING_SCHEDULED ? 1 : 0;
      quarantinedCount += status === PlanRetirementMigrationStatus.FAILED ? 1 : 0;
      retryableCount += status === null ? 1 : 0;
    }
    return {
      scannedCount: migrations.length,
      repairedCount,
      quarantinedCount,
      unprocessedCount: retryableCount + (migrations.length === RECONCILIATION_BATCH_SIZE ? 1 : 0),
    };
  }

  private async processSafely(
    migration: PendingPlanRetirementMigration,
  ): Promise<PlanRetirementMigrationStatus | null> {
    try {
      const status = await this.process(migration);
      if (status === null) {
        return null;
      }
      await this.client.recordOutcome(migration.id, status);
      return status;
    } catch {
      this.logger.error(
        `processSafely: failed migration=${migration.id} code=${PLAN_RETIREMENT_FAILURE_CODE}`,
      );
      return null;
    }
  }

  private async process(
    migration: PendingPlanRetirementMigration,
  ): Promise<PlanRetirementMigrationStatus | null> {
    const subscription = await this.subscriptions.findById(migration.sourceSubscriptionId);
    if (!this.matchesSource(subscription, migration) || subscription === null) {
      return PlanRetirementMigrationStatus.SUPERSEDED;
    }
    if (subscription.scheduledPlanId !== null || subscription.scheduledEffectiveAt !== null) {
      return this.resolveExistingSchedule(subscription, migration);
    }
    const price = await this.catalog.requireActivePrice(
      migration.replacementPlanId,
      subscription.billingInterval,
    );
    this.assertCompatiblePrice(subscription, migration, price);
    const scheduled = await this.schedule(subscription, migration, price);
    if (scheduled) {
      return PlanRetirementMigrationStatus.BILLING_SCHEDULED;
    }
    return this.resolveScheduleRace(migration, price);
  }

  private async resolveScheduleRace(
    migration: PendingPlanRetirementMigration,
    price: PlanPriceVersionView,
  ): Promise<PlanRetirementMigrationStatus | null> {
    const current = await this.subscriptions.findById(migration.sourceSubscriptionId);
    if (!this.matchesSource(current, migration) || current === null) {
      return PlanRetirementMigrationStatus.SUPERSEDED;
    }
    if (current.scheduledChangeReason !== ScheduledPlanChangeReason.PLAN_RETIREMENT) {
      return current.scheduledPlanId !== null || current.scheduledEffectiveAt !== null
        ? PlanRetirementMigrationStatus.SUPERSEDED
        : null;
    }
    return this.matchesScheduledRetirement(current, migration, price)
      ? PlanRetirementMigrationStatus.BILLING_SCHEDULED
      : null;
  }

  private async resolveExistingSchedule(
    subscription: Subscription,
    migration: PendingPlanRetirementMigration,
  ): Promise<PlanRetirementMigrationStatus | null> {
    if (subscription.scheduledChangeReason !== ScheduledPlanChangeReason.PLAN_RETIREMENT) {
      return PlanRetirementMigrationStatus.SUPERSEDED;
    }
    if (subscription.scheduledPlanPriceVersionId === null) {
      return null;
    }
    const price = await this.catalog.requirePriceVersion(subscription.scheduledPlanPriceVersionId);
    this.assertCompatibleFrozenPrice(subscription, migration, price);
    return this.matchesScheduledRetirement(subscription, migration, price)
      ? PlanRetirementMigrationStatus.BILLING_SCHEDULED
      : PlanRetirementMigrationStatus.SUPERSEDED;
  }

  private matchesScheduledRetirement(
    subscription: Subscription,
    migration: PendingPlanRetirementMigration,
    price: PlanPriceVersionView,
  ): boolean {
    return (
      subscription.scheduledPlanId === migration.replacementPlanId &&
      subscription.scheduledPlanSlug === migration.replacementPlanSlug &&
      subscription.scheduledPlanPriceVersionId === price.id &&
      subscription.scheduledAmountMinor === price.amountMinor &&
      subscription.scheduledBillingInterval === subscription.billingInterval &&
      subscription.scheduledEffectiveAt?.getTime() === subscription.currentPeriodEnd.getTime()
    );
  }

  private matchesSource(
    subscription: Subscription | null,
    migration: PendingPlanRetirementMigration,
  ): boolean {
    return (
      subscription !== null &&
      subscription.id === migration.sourceSubscriptionId &&
      subscription.userId === migration.userId &&
      subscription.planId === migration.sourcePlanId
    );
  }

  private assertCompatiblePrice(
    subscription: Subscription,
    migration: PendingPlanRetirementMigration,
    price: PlanPriceVersionView,
  ): void {
    if (
      price.planId !== migration.replacementPlanId ||
      price.billingInterval !== subscription.billingInterval ||
      price.currency !== subscription.currency ||
      !price.isActive
    ) {
      throw new Error(PLAN_RETIREMENT_FAILURE_CODE);
    }
  }

  private assertCompatibleFrozenPrice(
    subscription: Subscription,
    migration: PendingPlanRetirementMigration,
    price: PlanPriceVersionView,
  ): void {
    if (
      price.planId !== migration.replacementPlanId ||
      price.billingInterval !== subscription.billingInterval ||
      price.currency !== subscription.currency
    ) {
      throw new Error(PLAN_RETIREMENT_FAILURE_CODE);
    }
  }

  private async schedule(
    subscription: Subscription,
    migration: PendingPlanRetirementMigration,
    price: PlanPriceVersionView,
  ): Promise<boolean> {
    return this.subscriptions.schedulePlanRetirementIfUnchanged({
      subscriptionId: subscription.id,
      expectedVersion: subscription.version,
      replacementPlanId: migration.replacementPlanId,
      replacementPlanSlug: migration.replacementPlanSlug,
      replacementPlanPriceVersionId: price.id,
      replacementAmountMinor: price.amountMinor,
      billingInterval: subscription.billingInterval,
      effectiveAt: subscription.currentPeriodEnd,
      reason: ScheduledPlanChangeReason.PLAN_RETIREMENT,
    });
  }
}
