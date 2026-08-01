import { Injectable, Logger } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import {
  type BillingSubscriptionDowngradedPayload,
  type BillingSubscriptionUpgradedPayload,
  EntitlementGrantType,
  EventPattern,
} from '@claw/shared-types';

import { PrismaService } from '../../../infrastructure/database/prisma/prisma.service';
import { OutboxRepository } from '../../outbox/repositories/outbox.repository';
import {
  BILLING_EVENT_SCHEMA_VERSION,
  PAYMENT_PRODUCER,
} from '../../billing/constants/billing.constants';
import { type ProrationQuoteView } from '../../billing/types/proration.types';
import { type Prisma, type Subscription } from '../../../generated/prisma';
import { ScheduledPlanChangeReason } from '../enums/scheduled-plan-change-reason.enum';

/**
 * Applies a plan change that takes no money.
 *
 * Two shapes land here:
 *
 * - A **downgrade**, which is queued for period end. The customer paid for the
 *   current period at the higher tier and keeps it; shrinking their plan
 *   immediately would be taking back something already bought, and refunding
 *   the difference is a cash decision that needs a policy, not a button.
 * - A **zero-amount change**, where proration rounds the difference to nothing.
 *   That applies immediately — there is no money involved either way.
 *
 * Both write the state change and the entitlement event in ONE transaction, so
 * a crash between them cannot leave auth believing something payment does not.
 */
@Injectable()
export class ScheduledDowngradeService {
  private readonly logger = new Logger(ScheduledDowngradeService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly outbox: OutboxRepository,
  ) {}

  async schedule(subscription: Subscription, quote: ProrationQuoteView): Promise<void> {
    this.logger.debug(`schedule: subscription=${subscription.id} -> ${quote.targetPlanSlug}`);
    const effectiveAt = new Date(quote.scheduledEffectiveAtMs ?? subscription.currentPeriodEnd);

    await this.prisma.$transaction(async (tx) => {
      await tx.subscription.update({
        where: { id: subscription.id },
        data: {
          scheduledPlanId: quote.targetPlanId,
          scheduledPlanSlug: quote.targetPlanSlug,
          scheduledPlanPriceVersionId: quote.targetPriceVersionId,
          scheduledAmountMinor: quote.targetAmountMinor,
          scheduledBillingInterval: quote.targetBillingInterval,
          scheduledEffectiveAt: effectiveAt,
          scheduledChangeReason: ScheduledPlanChangeReason.USER_REQUESTED_DOWNGRADE,
          version: { increment: 1 },
        },
      });
      await this.outbox.enqueue(tx, {
        pattern: EventPattern.BILLING_SUBSCRIPTION_DOWNGRADE_SCHEDULED,
        eventId: randomUUID(),
        aggregateType: 'Subscription',
        aggregateId: subscription.id,
        payloadJson: {
          schemaVersion: BILLING_EVENT_SCHEMA_VERSION,
          producer: PAYMENT_PRODUCER,
          userId: subscription.userId,
          subscriptionId: subscription.id,
          planId: subscription.planId,
          scheduledPlanId: quote.targetPlanId,
          effectiveAt: new Date().toISOString(),
          // Unchanged: the CURRENT plan's entitlement runs to period end. The
          // downgrade is a future event, not a present revocation.
          entitlementValidUntil: subscription.entitlementValidUntil.toISOString(),
          scheduledEffectiveAt: effectiveAt.toISOString(),
          correlationId: quote.quoteId,
          causationId: subscription.id,
        },
      });
    });

    this.logger.log(
      `schedule: subscription=${subscription.id} moves to ${quote.targetPlanSlug} ` +
        `at ${effectiveAt.toISOString()}`,
    );
  }

  async applyImmediately(subscription: Subscription, quote: ProrationQuoteView): Promise<void> {
    this.logger.debug(`applyImmediately: subscription=${subscription.id}`);

    await this.prisma.$transaction(async (tx) => {
      await tx.subscription.update({
        where: { id: subscription.id },
        data: {
          planId: quote.targetPlanId,
          planSlug: quote.targetPlanSlug,
          planPriceVersionId: quote.targetPriceVersionId,
          amountMinor: quote.targetAmountMinor,
          billingInterval: quote.targetBillingInterval,
          scheduledPlanId: null,
          scheduledPlanSlug: null,
          scheduledPlanPriceVersionId: null,
          scheduledAmountMinor: null,
          scheduledBillingInterval: null,
          scheduledEffectiveAt: null,
          scheduledChangeReason: null,
          version: { increment: 1 },
        },
      });
      await this.outbox.enqueue(tx, {
        pattern: EventPattern.BILLING_SUBSCRIPTION_UPGRADED,
        eventId: randomUUID(),
        aggregateType: 'Subscription',
        aggregateId: subscription.id,
        payloadJson: {
          schemaVersion: BILLING_EVENT_SCHEMA_VERSION,
          producer: PAYMENT_PRODUCER,
          userId: subscription.userId,
          subscriptionId: subscription.id,
          planId: quote.targetPlanId,
          planPriceVersionId: quote.targetPriceVersionId,
          effectiveAt: new Date().toISOString(),
          entitlementValidUntil: subscription.entitlementValidUntil.toISOString(),
          correlationId: quote.quoteId,
          causationId: subscription.id,
        },
      });
    });

    this.logger.log(
      `applyImmediately: subscription=${subscription.id} now ${quote.targetPlanSlug}`,
    );
  }

  async applyDue(subscription: Subscription, now: Date, correlationId: string): Promise<boolean> {
    if (
      subscription.scheduledPlanId === null ||
      subscription.scheduledPlanSlug === null ||
      subscription.scheduledPlanPriceVersionId === null ||
      subscription.scheduledAmountMinor === null ||
      subscription.scheduledBillingInterval === null
    ) {
      this.logger.error(`applyDue: incomplete snapshot subscription=${subscription.id}`);
      return false;
    }

    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.subscription.updateMany({
        where: {
          id: subscription.id,
          version: subscription.version,
          scheduledEffectiveAt: { not: null, lte: now },
        },
        data: {
          planId: subscription.scheduledPlanId ?? subscription.planId,
          planSlug: subscription.scheduledPlanSlug ?? subscription.planSlug,
          planPriceVersionId:
            subscription.scheduledPlanPriceVersionId ?? subscription.planPriceVersionId,
          amountMinor: subscription.scheduledAmountMinor ?? subscription.amountMinor,
          billingInterval: subscription.scheduledBillingInterval ?? subscription.billingInterval,
          scheduledPlanId: null,
          scheduledPlanSlug: null,
          scheduledPlanPriceVersionId: null,
          scheduledAmountMinor: null,
          scheduledBillingInterval: null,
          scheduledEffectiveAt: null,
          scheduledChangeReason: null,
          version: { increment: 1 },
        },
      });
      if (updated.count === 0) {
        return false;
      }
      await this.enqueueAppliedChange(tx, subscription, now, correlationId);
      return true;
    });
  }

  private async enqueueAppliedChange(
    tx: Prisma.TransactionClient,
    subscription: Subscription,
    now: Date,
    correlationId: string,
  ): Promise<void> {
    if (subscription.scheduledChangeReason === ScheduledPlanChangeReason.PLAN_RETIREMENT) {
      await this.enqueueAppliedRetirement(tx, subscription, now, correlationId);
      return;
    }
    await this.enqueueAppliedDowngrade(tx, subscription, now, correlationId);
  }

  private async enqueueAppliedRetirement(
    tx: Prisma.TransactionClient,
    subscription: Subscription,
    now: Date,
    correlationId: string,
  ): Promise<void> {
    const eventId = randomUUID();
    const effectiveAt = now.toISOString();
    const payload: BillingSubscriptionUpgradedPayload = {
      ...this.appliedPayload(subscription, eventId, effectiveAt, correlationId),
      prorationAmountMinor: 0,
      currency: subscription.currency,
    };
    await this.outbox.enqueue(tx, {
      pattern: EventPattern.BILLING_SUBSCRIPTION_UPGRADED,
      eventId,
      aggregateType: 'Subscription',
      aggregateId: subscription.id,
      payloadJson: payload,
    });
  }

  private async enqueueAppliedDowngrade(
    tx: Prisma.TransactionClient,
    subscription: Subscription,
    now: Date,
    correlationId: string,
  ): Promise<void> {
    const eventId = randomUUID();
    const effectiveAt = now.toISOString();
    const payload: BillingSubscriptionDowngradedPayload = {
      ...this.appliedPayload(subscription, eventId, effectiveAt, correlationId),
    };
    await this.outbox.enqueue(tx, {
      pattern: EventPattern.BILLING_SUBSCRIPTION_DOWNGRADED,
      eventId,
      aggregateType: 'Subscription',
      aggregateId: subscription.id,
      payloadJson: payload,
    });
  }

  private appliedPayload(
    subscription: Subscription,
    eventId: string,
    effectiveAt: string,
    correlationId: string,
  ): BillingSubscriptionDowngradedPayload {
    return {
      eventId,
      schemaVersion: BILLING_EVENT_SCHEMA_VERSION,
      producer: PAYMENT_PRODUCER,
      userId: subscription.userId,
      subscriptionId: subscription.id,
      planId: subscription.scheduledPlanId ?? subscription.planId,
      planSlug: subscription.scheduledPlanSlug ?? subscription.planSlug,
      planPriceVersionId:
        subscription.scheduledPlanPriceVersionId ?? subscription.planPriceVersionId,
      grantType: EntitlementGrantType.PAID_SUBSCRIPTION,
      effectiveAt,
      entitlementValidUntil: subscription.entitlementValidUntil.toISOString(),
      correlationId,
      causationId: subscription.id,
      occurredAt: effectiveAt,
      previousPlanId: subscription.planId,
      previousPlanSlug: subscription.planSlug,
      previousPlanPriceVersionId: subscription.planPriceVersionId,
    };
  }
}
