import { Injectable, Logger } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import {
  BillingErrorCode,
  type BillingSubscriptionCancelledPayload,
  EntitlementGrantType,
  EventPattern,
  SubscriptionStatus,
} from '@claw/shared-types';

import { BillingException } from '../../../common/errors';
import { assertTransition } from '../../../common/utilities/subscription-state-machine.utility';
import { type Prisma, type Subscription } from '../../../generated/prisma';
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
 * Self-service scheduled cancellation, immediate termination, and resume.
 *
 * Scheduled cancellation retains paid entitlement through period end and can
 * be resumed. Immediate termination is an explicit forfeiture: entitlement is
 * revoked now while the append-only financial record remains auditable.
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
    const cancelledAt = new Date();

    const updated = await this.prisma.$transaction(async (tx) => {
      const row = await tx.subscription.update({
        where: { id: subscription.id },
        data: { cancelAtPeriodEnd: true, cancelledAt, version: { increment: 1 } },
      });
      // Auth is told when entitlement ENDS, not that it ended now: the payload
      // carries currentPeriodEnd, so the user keeps the plan for the period
      // they already bought and auth drops it exactly when that runs out.
      await this.enqueueCancellation(tx, row, userId, cancelledAt, row.currentPeriodEnd, true);
      return row;
    });

    this.logger.log(
      `cancelAtPeriodEnd: subscription=${updated.id} ends ${updated.currentPeriodEnd.toISOString()}`,
    );
    return toCurrentSubscriptionView(updated, await this.resolvePlanName(updated.planId));
  }

  async endNow(userId: string): Promise<CurrentSubscriptionView> {
    this.logger.debug(`endNow: user=${userId}`);
    const subscription = await this.requireTerminable(userId);
    assertTransition(subscription.status as SubscriptionStatus, SubscriptionStatus.CANCELLED);
    const cancelledAt = new Date();

    const updated = await this.commitImmediateTermination(subscription, cancelledAt, userId);

    this.logger.log(`endNow: subscription=${updated.id} entitlement revoked`);
    return toCurrentSubscriptionView(updated, await this.resolvePlanName(updated.planId));
  }

  private async commitImmediateTermination(
    subscription: Subscription,
    cancelledAt: Date,
    userId: string,
  ): Promise<Subscription> {
    return this.prisma.$transaction(async (tx) => {
      const result = await tx.subscription.updateMany({
        where: { id: subscription.id, version: subscription.version },
        data: {
          status: SubscriptionStatus.CANCELLED,
          cancelAtPeriodEnd: false,
          cancelledAt,
          entitlementValidUntil: cancelledAt,
          gracePeriodEndsAt: null,
          scheduledPlanId: null,
          scheduledPlanSlug: null,
          scheduledPlanPriceVersionId: null,
          scheduledAmountMinor: null,
          scheduledBillingInterval: null,
          scheduledEffectiveAt: null,
          uniqueActiveKey: null,
          version: { increment: 1 },
        },
      });
      if (result.count === 0) {
        throw new BillingException(BillingErrorCode.SUBSCRIPTION_CHANGE_CONFLICT);
      }

      const row = await tx.subscription.findUnique({ where: { id: subscription.id } });
      if (row === null) {
        throw new BillingException(BillingErrorCode.SUBSCRIPTION_CHANGE_CONFLICT);
      }
      await this.enqueueCancellation(tx, row, userId, cancelledAt, cancelledAt, false);
      return row;
    });
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

  private async requireTerminable(userId: string): Promise<Subscription> {
    const subscription = await this.subscriptions.findActiveByUserId(userId);
    if (subscription === null) {
      throw new BillingException(BillingErrorCode.SUBSCRIPTION_NOT_FOUND);
    }
    if (!CANCELLABLE_STATUSES.includes(subscription.status as SubscriptionStatus)) {
      throw new BillingException(BillingErrorCode.SUBSCRIPTION_CHANGE_CONFLICT);
    }
    return subscription;
  }

  private async enqueueCancellation(
    tx: Prisma.TransactionClient,
    subscription: Subscription,
    userId: string,
    cancelledAt: Date,
    entitlementValidUntil: Date,
    cancelAtPeriodEnd: boolean,
  ): Promise<void> {
    const eventId = randomUUID();
    const effectiveAt = cancelledAt.toISOString();
    const payload: BillingSubscriptionCancelledPayload = {
      eventId,
      schemaVersion: BILLING_EVENT_SCHEMA_VERSION,
      producer: PAYMENT_PRODUCER,
      userId,
      subscriptionId: subscription.id,
      planId: subscription.planId,
      planSlug: subscription.planSlug,
      planPriceVersionId: subscription.planPriceVersionId,
      grantType: EntitlementGrantType.PAID_SUBSCRIPTION,
      effectiveAt,
      entitlementValidUntil: entitlementValidUntil.toISOString(),
      cancelAtPeriodEnd,
      cancelledAt: effectiveAt,
      correlationId: subscription.id,
      causationId: null,
      occurredAt: effectiveAt,
    };
    await this.outbox.enqueue(tx, {
      pattern: EventPattern.BILLING_SUBSCRIPTION_CANCELLED,
      eventId,
      aggregateType: 'Subscription',
      aggregateId: subscription.id,
      payloadJson: payload,
    });
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
