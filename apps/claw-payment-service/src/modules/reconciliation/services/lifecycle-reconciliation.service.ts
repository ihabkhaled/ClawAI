import { Injectable } from '@nestjs/common';

import {
  ReconciliationClassification,
  ReconciliationEntityType,
  ReconciliationResolution,
} from '../../../common/enums/reconciliation.enum';
import { SubscriptionLifecycleService } from '../../billing/services/subscription-lifecycle.service';
import { SubscriptionRepository } from '../../subscriptions/repositories/subscription.repository';
import { ScheduledDowngradeService } from '../../subscriptions/services/scheduled-downgrade.service';
import { RECONCILIATION_BATCH_SIZE } from '../constants/reconciliation.constants';
import { ReconciliationRepository } from '../repositories/reconciliation.repository';
import type { Subscription } from '../../../generated/prisma';
import type { ReconciliationCounts } from '../types/reconciliation.types';

@Injectable()
export class LifecycleReconciliationService {
  constructor(
    private readonly subscriptions: SubscriptionRepository,
    private readonly lifecycle: SubscriptionLifecycleService,
    private readonly downgrades: ScheduledDowngradeService,
    private readonly reconciliation: ReconciliationRepository,
  ) {}

  async reconcile(runId: string, now: Date): Promise<ReconciliationCounts> {
    const grace = await this.reconcileGrace(runId, now);
    const downgrades = await this.reconcileDowngrades(runId, now);
    return {
      scannedCount: grace.scannedCount + downgrades.scannedCount,
      repairedCount: grace.repairedCount + downgrades.repairedCount,
      quarantinedCount: grace.quarantinedCount + downgrades.quarantinedCount,
      unprocessedCount: grace.unprocessedCount + downgrades.unprocessedCount,
    };
  }

  private async reconcileGrace(runId: string, now: Date): Promise<ReconciliationCounts> {
    const total = await this.subscriptions.countGraceExpired(now);
    const candidates = await this.subscriptions.findGraceExpired(now, RECONCILIATION_BATCH_SIZE);
    let repairedCount = 0;
    for (const subscription of candidates) {
      const repaired = await this.expireGrace(runId, subscription, now);
      repairedCount += repaired ? 1 : 0;
    }
    return {
      scannedCount: candidates.length,
      repairedCount,
      quarantinedCount: 0,
      unprocessedCount: Math.max(0, total - candidates.length),
    };
  }

  private async expireGrace(
    runId: string,
    subscription: Subscription,
    now: Date,
  ): Promise<boolean> {
    if (subscription.gracePeriodEndsAt === null) {
      return false;
    }
    const repaired = await this.lifecycle.expirePastDueIfVersionMatches(
      subscription.id,
      subscription.userId,
      subscription.version,
      subscription.gracePeriodEndsAt,
      now,
      `reconcile:${runId}:grace:${subscription.id}`,
    );
    await this.recordLifecycleFinding(
      runId,
      subscription,
      ReconciliationClassification.GRACE_PERIOD_EXPIRED,
      repaired ? ReconciliationResolution.REPAIRED : ReconciliationResolution.SUPERSEDED,
    );
    return repaired;
  }

  private async reconcileDowngrades(runId: string, now: Date): Promise<ReconciliationCounts> {
    const total = await this.subscriptions.countDueScheduledChanges(now);
    const candidates = await this.subscriptions.findDueScheduledChanges(
      now,
      RECONCILIATION_BATCH_SIZE,
    );
    let repairedCount = 0;
    let quarantinedCount = 0;
    for (const subscription of candidates) {
      const complete = LifecycleReconciliationService.hasCompleteDowngrade(subscription);
      const repaired = complete
        ? await this.downgrades.applyDue(
            subscription,
            now,
            `reconcile:${runId}:downgrade:${subscription.id}`,
          )
        : false;
      repairedCount += repaired ? 1 : 0;
      quarantinedCount += complete ? 0 : 1;
      await this.recordLifecycleFinding(
        runId,
        subscription,
        ReconciliationClassification.SCHEDULED_DOWNGRADE_DUE,
        LifecycleReconciliationService.resolveDowngrade(repaired, complete),
      );
    }
    return {
      scannedCount: candidates.length,
      repairedCount,
      quarantinedCount,
      unprocessedCount: Math.max(0, total - candidates.length),
    };
  }

  private async recordLifecycleFinding(
    runId: string,
    subscription: Subscription,
    classification: ReconciliationClassification,
    resolution: ReconciliationResolution,
  ): Promise<void> {
    await this.reconciliation.recordFinding({
      runId,
      entityType: ReconciliationEntityType.SUBSCRIPTION,
      entityId: subscription.id,
      gateway: subscription.gateway,
      classification,
      localStatus: subscription.status,
      providerStatus: null,
      resolution,
      repairedAt: resolution === ReconciliationResolution.REPAIRED ? new Date() : null,
    });
  }

  private static hasCompleteDowngrade(subscription: Subscription): boolean {
    return (
      subscription.scheduledPlanId !== null &&
      subscription.scheduledPlanSlug !== null &&
      subscription.scheduledPlanPriceVersionId !== null &&
      subscription.scheduledAmountMinor !== null &&
      subscription.scheduledBillingInterval !== null
    );
  }

  private static resolveDowngrade(repaired: boolean, complete: boolean): ReconciliationResolution {
    if (repaired) {
      return ReconciliationResolution.REPAIRED;
    }
    return complete ? ReconciliationResolution.SUPERSEDED : ReconciliationResolution.QUARANTINED;
  }
}
