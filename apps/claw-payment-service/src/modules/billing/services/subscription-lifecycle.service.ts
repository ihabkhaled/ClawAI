import { Injectable, Logger } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import {
  BillingErrorCode,
  CheckoutSessionStatus,
  EventPattern,
  PaymentTransactionType,
  SubscriptionStatus,
} from '@claw/shared-types';

import { AppConfig } from '../../../app/config/app.config';
import { BillingException } from '../../../common/errors';
import { PrismaService } from '../../../infrastructure/database/prisma/prisma.service';
import { OutboxRepository } from '../../outbox/repositories/outbox.repository';
import { resolveUniqueActiveKey } from '../../../common/utilities/subscription-state-machine.utility';
import { BILLING_EVENT_SCHEMA_VERSION, PAYMENT_PRODUCER } from '../constants/billing.constants';
import { BillingRecordService } from './billing-record.service';
import {
  type ActivateSubscriptionInput,
  type ActivationResult,
  type ReverseSubscriptionInput,
} from '../types/subscription-lifecycle.types';

// Commits the subscription, the checkout session and the entitlement event in
// ONE database transaction.
//
// This is the heart of the guarantee that a paid entitlement cannot exist
// without a verified payment. Publishing the event outside the transaction
// would mean a crash between commit and publish leaves a paying customer with
// no entitlement — or an event with no payment behind it. The outbox row is
// written transactionally and a separate publisher drains it, so the two can
// never disagree.
@Injectable()
export class SubscriptionLifecycleService {
  private readonly logger = new Logger(SubscriptionLifecycleService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly outbox: OutboxRepository,
    private readonly records: BillingRecordService,
  ) {}

  async activateFromVerifiedPayment(input: ActivateSubscriptionInput): Promise<ActivationResult> {
    this.logger.debug(`activateFromVerifiedPayment: session=${input.checkoutSessionId}`);
    if (!input.paymentVerified) {
      // Defence in depth. The only current caller verifies first, but a future
      // one must not be able to activate simply by not checking.
      this.logger.error('activateFromVerifiedPayment: refused — payment was not verified');
      throw new BillingException(BillingErrorCode.PAYMENT_NOT_VERIFIED);
    }

    return this.prisma.$transaction(async (tx) => {
      const subscription = await tx.subscription.create({
        data: {
          userId: input.userId,
          billingCustomerId: input.billingCustomerId,
          planId: input.planId,
          planSlug: input.planSlug,
          planPriceVersionId: input.planPriceVersionId,
          gateway: input.gateway,
          status: SubscriptionStatus.ACTIVE,
          billingInterval: input.billingInterval,
          currency: input.baseCurrency,
          amountMinor: input.baseAmountMinor,
          currentPeriodStart: new Date(input.periodStartMs),
          currentPeriodEnd: new Date(input.periodEndMs),
          entitlementValidUntil: new Date(input.entitlementValidUntilMs),
          encryptedGatewaySubscriptionId: input.encryptedGatewaySubscriptionId,
          gatewaySubscriptionLookupHash: input.gatewaySubscriptionLookupHash,
          // Derived, never caller-supplied: the database-level guarantee of one
          // effective subscription per user.
          uniqueActiveKey: resolveUniqueActiveKey(SubscriptionStatus.ACTIVE, input.userId),
        },
      });

      await tx.checkoutSession.update({
        where: { id: input.checkoutSessionId },
        data: {
          status: CheckoutSessionStatus.COMPLETED,
          subscriptionId: subscription.id,
          verifiedAt: new Date(),
          completedAt: new Date(),
        },
      });

      // The money, recorded in the same transaction as the subscription it paid
      // for. Recorded here rather than by the caller so there is no path that
      // opens a paid subscription without also writing the charge and the invoice
      // that document it — that gap is why /billing/invoices returned nothing.
      const charge = await this.records.recordCharge(tx, {
        userId: input.userId,
        invoiceRecipientEmail: input.invoiceRecipientEmail,
        subscriptionId: subscription.id,
        checkoutSessionId: input.checkoutSessionId,
        gateway: input.gateway,
        type: PaymentTransactionType.CHARGE,
        amountMinor: input.baseAmountMinor,
        currency: input.baseCurrency,
        providerAmountMinor: input.providerAmountMinor,
        providerCurrency: input.providerCurrency,
        providerTransactionId: input.providerTransactionId,
        providerOrderId: input.providerOrderId,
        // Scoped to the checkout session: a replayed activation for the same
        // session collides on (userId, idempotencyKey) instead of double-billing.
        idempotencyKey: `charge:${input.checkoutSessionId}`,
        priceSnapshot: {
          planId: input.planId,
          planSlug: input.planSlug,
          planPriceVersionId: input.planPriceVersionId,
          billingInterval: input.billingInterval,
          amountMinor: input.baseAmountMinor,
          currency: input.baseCurrency,
        },
        fxSnapshot: null,
        periodStart: new Date(input.periodStartMs),
        periodEnd: new Date(input.periodEndMs),
        lineDescription: `${input.planSlug} — ${input.billingInterval.toLowerCase()}`,
      });

      // Same transaction as the state change above. This is what makes the
      // entitlement event exactly as durable as the payment itself.
      await this.outbox.enqueue(tx, {
        pattern: EventPattern.BILLING_SUBSCRIPTION_ACTIVATED,
        eventId: randomUUID(),
        aggregateType: 'Subscription',
        aggregateId: subscription.id,
        payloadJson: {
          schemaVersion: BILLING_EVENT_SCHEMA_VERSION,
          producer: PAYMENT_PRODUCER,
          userId: input.userId,
          subscriptionId: subscription.id,
          planId: input.planId,
          planPriceVersionId: input.planPriceVersionId,
          effectiveAt: new Date().toISOString(),
          entitlementValidUntil: new Date(input.entitlementValidUntilMs).toISOString(),
          correlationId: input.correlationId,
          causationId: input.checkoutSessionId,
        },
      });

      this.logger.log(
        `activateFromVerifiedPayment: subscription=${subscription.id} ` +
          `invoice=${charge.invoiceNumber}`,
      );
      return {
        subscriptionId: subscription.id,
        transactionId: charge.transactionId,
        invoiceNumber: charge.invoiceNumber,
      };
    });
  }

  /**
   * Reverses money and revokes the entitlement it paid for, atomically.
   *
   * One transaction covering three things: the compensating transaction row, the
   * refunded invoice, and the subscription status plus its entitlement event. A
   * refund recorded without the revocation leaves someone using a paid plan they
   * were refunded for; a revocation without the record leaves an unexplained loss
   * of access. Neither half is acceptable on its own.
   *
   * Returns false when the provider transaction was already recorded, so a
   * redelivered refund webhook is a no-op rather than a second reversal.
   */
  async reverseAndRevoke(input: ReverseSubscriptionInput): Promise<boolean> {
    this.logger.warn(`reverseAndRevoke: subscription=${input.subscriptionId} type=${input.type}`);
    return this.prisma.$transaction(async (tx) => {
      const reversalId = await this.records.recordReversal(tx, {
        userId: input.userId,
        subscriptionId: input.subscriptionId,
        gateway: input.gateway,
        type: input.type,
        amountMinor: input.amountMinor,
        currency: input.currency,
        providerAmountMinor: input.providerAmountMinor,
        providerCurrency: input.providerCurrency,
        providerTransactionId: input.providerTransactionId,
        idempotencyKey: input.idempotencyKey,
        reversesTransactionId: input.reversesTransactionId,
        invoiceId: input.invoiceId,
      });
      if (reversalId === null) {
        return false;
      }

      await tx.subscription.update({
        where: { id: input.subscriptionId },
        data: {
          status: input.status,
          uniqueActiveKey: resolveUniqueActiveKey(input.status, input.userId),
          version: { increment: 1 },
        },
      });
      await this.outbox.enqueue(tx, {
        pattern: input.pattern,
        eventId: randomUUID(),
        aggregateType: 'Subscription',
        aggregateId: input.subscriptionId,
        payloadJson: {
          schemaVersion: BILLING_EVENT_SCHEMA_VERSION,
          producer: PAYMENT_PRODUCER,
          userId: input.userId,
          subscriptionId: input.subscriptionId,
          effectiveAt: new Date().toISOString(),
          // Revocation is immediate: entitlement ends now, not at period end.
          entitlementValidUntil: new Date().toISOString(),
          correlationId: input.correlationId,
          causationId: input.providerTransactionId ?? input.subscriptionId,
        },
      });
      return true;
    });
  }

  /**
   * Marks a subscription PAST_DUE and opens the grace window.
   *
   * Entitlement is deliberately NOT revoked here. A declined card is usually
   * temporary — an expired card, a bank hold, a travel block — and locking a
   * paying customer out the instant a renewal fails is both hostile and bad for
   * recovery. The grace sweep downgrades them if it is still unpaid when the
   * window closes.
   *
   * `gracePeriodEndsAt` is written now rather than computed later so the deadline
   * is fixed at the moment of failure and cannot drift with config changes.
   */
  async markPastDue(subscriptionId: string, userId: string, correlationId: string): Promise<void> {
    const gracePeriodEndsAt = new Date(Date.now() + AppConfig.get().BILLING_GRACE_PERIOD_MS);
    this.logger.warn(
      `markPastDue: subscription=${subscriptionId} graceEndsAt=${gracePeriodEndsAt.toISOString()}`,
    );
    await this.prisma.$transaction(async (tx) => {
      await tx.subscription.update({
        where: { id: subscriptionId },
        data: {
          status: SubscriptionStatus.PAST_DUE,
          pastDueAt: new Date(),
          gracePeriodEndsAt,
          // Still the effective subscription: the customer keeps access, so the
          // uniqueness key must stay claimed or they could open a second one.
          uniqueActiveKey: resolveUniqueActiveKey(SubscriptionStatus.PAST_DUE, userId),
          version: { increment: 1 },
        },
      });
      await this.outbox.enqueue(tx, {
        pattern: EventPattern.BILLING_SUBSCRIPTION_PAST_DUE,
        eventId: randomUUID(),
        aggregateType: 'Subscription',
        aggregateId: subscriptionId,
        payloadJson: {
          schemaVersion: BILLING_EVENT_SCHEMA_VERSION,
          producer: PAYMENT_PRODUCER,
          userId,
          subscriptionId,
          effectiveAt: new Date().toISOString(),
          // Access continues to the end of grace, which is what auth enforces.
          entitlementValidUntil: gracePeriodEndsAt.toISOString(),
          correlationId,
          causationId: subscriptionId,
        },
      });
    });
  }

  // Revokes paid entitlement immediately without a money movement — used where
  // access must end but nothing is being refunded (grace-period expiry).
  async revokeEntitlement(params: {
    subscriptionId: string;
    userId: string;
    status: SubscriptionStatus;
    pattern: EventPattern;
    correlationId: string;
  }): Promise<void> {
    this.logger.warn(
      `revokeEntitlement: subscription=${params.subscriptionId} status=${params.status}`,
    );
    await this.prisma.$transaction(async (tx) => {
      await tx.subscription.update({
        where: { id: params.subscriptionId },
        data: {
          status: params.status,
          // Releasing the key is what frees the user to subscribe again.
          uniqueActiveKey: resolveUniqueActiveKey(params.status, params.userId),
          version: { increment: 1 },
        },
      });
      await this.outbox.enqueue(tx, {
        pattern: params.pattern,
        eventId: randomUUID(),
        aggregateType: 'Subscription',
        aggregateId: params.subscriptionId,
        payloadJson: {
          schemaVersion: BILLING_EVENT_SCHEMA_VERSION,
          producer: PAYMENT_PRODUCER,
          userId: params.userId,
          subscriptionId: params.subscriptionId,
          effectiveAt: new Date().toISOString(),
          // Revocation is immediate: entitlement ends now, not at period end.
          entitlementValidUntil: new Date().toISOString(),
          correlationId: params.correlationId,
          causationId: params.subscriptionId,
        },
      });
    });
  }

  async expirePastDueIfVersionMatches(
    subscriptionId: string,
    userId: string,
    expectedVersion: number,
    graceDeadline: Date,
    now: Date,
    correlationId: string,
  ): Promise<boolean> {
    this.logger.warn(`expirePastDueIfVersionMatches: subscription=${subscriptionId}`);
    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.subscription.updateMany({
        where: {
          id: subscriptionId,
          status: SubscriptionStatus.PAST_DUE,
          version: expectedVersion,
          gracePeriodEndsAt: { equals: graceDeadline, lte: now },
        },
        data: {
          status: SubscriptionStatus.EXPIRED,
          uniqueActiveKey: resolveUniqueActiveKey(SubscriptionStatus.EXPIRED, userId),
          version: { increment: 1 },
        },
      });
      if (updated.count === 0) {
        return false;
      }
      await this.outbox.enqueue(tx, {
        pattern: EventPattern.BILLING_SUBSCRIPTION_EXPIRED,
        eventId: randomUUID(),
        aggregateType: 'Subscription',
        aggregateId: subscriptionId,
        payloadJson: {
          schemaVersion: BILLING_EVENT_SCHEMA_VERSION,
          producer: PAYMENT_PRODUCER,
          userId,
          subscriptionId,
          effectiveAt: now.toISOString(),
          entitlementValidUntil: now.toISOString(),
          correlationId,
          causationId: subscriptionId,
        },
      });
      return true;
    });
  }
}
