import { Injectable, Logger } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { BillingErrorCode, EventPattern, SubscriptionStatus } from '@claw/shared-types';

import { BillingException } from '../../../common/errors';
import { PrismaService } from '../../../infrastructure/database/prisma/prisma.service';
import { OutboxRepository } from '../../outbox/repositories/outbox.repository';
import {
  BILLING_EVENT_SCHEMA_VERSION,
  PAYMENT_PRODUCER,
} from '../../billing/constants/billing.constants';
import { CANCELLABLE_STATUSES } from '../constants/subscriptions.constants';
import { SubscriptionRepository } from '../repositories/subscription.repository';
import { PlanCatalogClient } from '../../plan-catalog/plan-catalog.client';
import { type CurrentSubscriptionView } from '../types/subscription-view.types';
import { toCurrentSubscriptionView } from '../utilities/subscription-view.utility';

/**
 * Self-service cancellation and its undo.
 *
 * Cancelling is always at period end. The customer paid for a period and keeps
 * it; ending access early would be a refund decision, and that belongs to an
 * operator with a policy, not to a button. So the status stays
 * entitlement-bearing and only `cancelAtPeriodEnd` flips — which is also what
 * makes resume a clean reversal rather than a re-purchase.
 */
@Injectable()
export class SubscriptionCancelService {
  private readonly logger = new Logger(SubscriptionCancelService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly subscriptions: SubscriptionRepository,
    private readonly outbox: OutboxRepository,
    private readonly catalog: PlanCatalogClient,
  ) {}

  async cancelAtPeriodEnd(userId: string): Promise<CurrentSubscriptionView> {
    this.logger.debug(`cancelAtPeriodEnd: user=${userId}`);
    const subscription = await this.requireCancellable(userId);

    const updated = await this.prisma.$transaction(async (tx) => {
      const row = await tx.subscription.update({
        where: { id: subscription.id },
        data: { cancelAtPeriodEnd: true, cancelledAt: new Date(), version: { increment: 1 } },
      });
      // Auth is told when entitlement ENDS, not that it ended now: the payload
      // carries currentPeriodEnd, so the user keeps the plan for the period
      // they already bought and auth drops it exactly when that runs out.
      await this.outbox.enqueue(tx, {
        pattern: EventPattern.BILLING_SUBSCRIPTION_CANCELLED,
        eventId: randomUUID(),
        aggregateType: 'Subscription',
        aggregateId: row.id,
        payloadJson: {
          schemaVersion: BILLING_EVENT_SCHEMA_VERSION,
          producer: PAYMENT_PRODUCER,
          userId,
          subscriptionId: row.id,
          planId: row.planId,
          effectiveAt: new Date().toISOString(),
          entitlementValidUntil: row.currentPeriodEnd.toISOString(),
          correlationId: row.id,
          causationId: row.id,
        },
      });
      return row;
    });

    this.logger.log(
      `cancelAtPeriodEnd: subscription=${updated.id} ends ${updated.currentPeriodEnd.toISOString()}`,
    );
    return toCurrentSubscriptionView(updated, await this.resolvePlanName(updated.planId));
  }

  async resume(userId: string): Promise<CurrentSubscriptionView> {
    this.logger.debug(`resume: user=${userId}`);
    const subscription = await this.subscriptions.findActiveByUserId(userId);
    if (subscription === null) {
      throw new BillingException(BillingErrorCode.SUBSCRIPTION_NOT_FOUND);
    }
    // Resuming something that was not cancelling is a no-op the caller should
    // know about, not a silent success that implies a state change happened.
    if (!subscription.cancelAtPeriodEnd) {
      throw new BillingException(BillingErrorCode.SUBSCRIPTION_CHANGE_CONFLICT);
    }

    const updated = await this.prisma.subscription.update({
      where: { id: subscription.id },
      data: { cancelAtPeriodEnd: false, cancelledAt: null, version: { increment: 1 } },
    });

    this.logger.log(`resume: subscription=${updated.id} will continue`);
    return toCurrentSubscriptionView(updated, await this.resolvePlanName(updated.planId));
  }

  private async requireCancellable(
    userId: string,
  ): Promise<{ id: string; status: string; cancelAtPeriodEnd: boolean }> {
    const subscription = await this.subscriptions.findActiveByUserId(userId);
    if (subscription === null) {
      throw new BillingException(BillingErrorCode.SUBSCRIPTION_NOT_FOUND);
    }
    if (!CANCELLABLE_STATUSES.includes(subscription.status as SubscriptionStatus)) {
      this.logger.warn(`requireCancellable: status ${subscription.status} is not cancellable`);
      throw new BillingException(BillingErrorCode.SUBSCRIPTION_CHANGE_CONFLICT);
    }
    if (subscription.cancelAtPeriodEnd) {
      throw new BillingException(BillingErrorCode.SUBSCRIPTION_CHANGE_CONFLICT);
    }
    return subscription;
  }

  private async resolvePlanName(planId: string): Promise<string | null> {
    try {
      const catalog = await this.catalog.listCatalog();
      return catalog.find((entry) => entry.id === planId)?.name ?? null;
    } catch {
      return null;
    }
  }
}
