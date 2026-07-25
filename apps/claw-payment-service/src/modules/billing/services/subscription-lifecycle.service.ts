import { Injectable, Logger } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import {
  BillingErrorCode,
  CheckoutSessionStatus,
  EventPattern,
  SubscriptionStatus,
} from '@claw/shared-types';

import { BillingException } from '../../../common/errors';
import { PrismaService } from '../../../infrastructure/database/prisma/prisma.service';
import { OutboxRepository } from '../../outbox/repositories/outbox.repository';
import { resolveUniqueActiveKey } from '../../../common/utilities/subscription-state-machine.utility';
import { BILLING_EVENT_SCHEMA_VERSION, PAYMENT_PRODUCER } from '../constants/billing.constants';
import { type ActivateSubscriptionInput } from '../types/subscription-lifecycle.types';

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
  ) {}

  async activateFromVerifiedPayment(input: ActivateSubscriptionInput): Promise<string> {
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

      this.logger.log(`activateFromVerifiedPayment: subscription=${subscription.id}`);
      return subscription.id;
    });
  }

  // Revokes paid entitlement immediately — chargeback and full refund. The
  // money is gone, so the access goes with it, in the same transaction as the
  // event that tells auth about it.
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
}
