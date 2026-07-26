import { Injectable, Logger } from '@nestjs/common';
import { EventPattern, PaymentTransactionType, SubscriptionStatus } from '@claw/shared-types';

import { PaymentTransactionRepository } from '../../billing/repositories/payment-transaction.repository';
import { SubscriptionLifecycleService } from '../../billing/services/subscription-lifecycle.service';
import { type ReversalRequest } from '../types/reversal.types';

/**
 * The single door between "a gateway says money came back" and "this user loses
 * their paid plan".
 *
 * The policy difference between the two reversal kinds is the whole reason this
 * exists as its own service:
 *
 * - **Refund** → `REFUNDED`. A customer-service outcome. We gave the money back,
 *   so the access goes with it.
 * - **Chargeback** → `SUSPENDED`. A dispute, not a decision. Access ends
 *   immediately because the funds are gone, but the status says "contested" so an
 *   operator reviewing the account can tell the two apart. Suspension also stops
 *   the disputed transaction being reused.
 *
 * Neither path deletes user data. Losing paid features is the consequence of a
 * reversal; losing your conversations is not.
 *
 * Every method is idempotent through the `(gateway, providerTransactionId)` unique
 * index, so a gateway redelivering a refund notification cannot refund twice.
 */
@Injectable()
export class PaymentReversalService {
  private readonly logger = new Logger(PaymentReversalService.name);

  constructor(
    private readonly lifecycle: SubscriptionLifecycleService,
    private readonly transactions: PaymentTransactionRepository,
  ) {}

  /** Money returned to the customer at our or their request. */
  async refund(request: ReversalRequest): Promise<boolean> {
    this.logger.warn(`refund: subscription=${request.subscriptionId}`);
    return this.apply(
      request,
      PaymentTransactionType.REFUND,
      SubscriptionStatus.REFUNDED,
      EventPattern.BILLING_PAYMENT_REFUNDED,
    );
  }

  /** Funds pulled back by the card network or PayPal. A dispute. */
  async chargeback(request: ReversalRequest): Promise<boolean> {
    this.logger.error(`chargeback: subscription=${request.subscriptionId}`);
    return this.apply(
      request,
      PaymentTransactionType.CHARGEBACK,
      SubscriptionStatus.SUSPENDED,
      EventPattern.BILLING_PAYMENT_CHARGEBACK,
    );
  }

  private async apply(
    request: ReversalRequest,
    type: PaymentTransactionType,
    status: SubscriptionStatus,
    pattern: EventPattern,
  ): Promise<boolean> {
    // Pair the reversal with the charge it offsets so reconciliation can match
    // them. When the gateway gives us no capture reference, the latest charge on
    // the subscription is the row a reversal most plausibly reverses — recorded as
    // a best-effort link, never used to decide whether to revoke.
    const original = await this.transactions.findLatestChargeForSubscription(
      request.subscriptionId,
    );

    return this.lifecycle.reverseAndRevoke({
      subscriptionId: request.subscriptionId,
      userId: request.userId,
      gateway: request.gateway,
      type,
      amountMinor: request.amountMinor,
      currency: request.currency,
      providerAmountMinor: request.providerAmountMinor,
      providerCurrency: request.providerCurrency,
      providerTransactionId: request.providerTransactionId,
      idempotencyKey: `${type.toLowerCase()}:${request.providerTransactionId ?? request.subscriptionId}`,
      reversesTransactionId: original?.id ?? null,
      invoiceId: request.invoiceId,
      status,
      pattern,
      correlationId: request.correlationId,
    });
  }
}
