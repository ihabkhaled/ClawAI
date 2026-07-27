import { Injectable, Logger } from '@nestjs/common';
import { EventPattern, PaymentTransactionType, SubscriptionStatus } from '@claw/shared-types';

import { SubscriptionLifecycleService } from '../../billing/services/subscription-lifecycle.service';
import { RefundWebhookService } from '../../refunds/services/refund-webhook.service';
import { type ReversalRequest } from '../types/reversal.types';

/**
 * The single door between "a gateway says money came back" and "this user loses
 * their paid plan".
 *
 * The policy difference between the two reversal kinds is the whole reason this
 * exists as its own service:
 *
 * - **Partial refund** keeps the paid entitlement. A cumulative full refund
 *   moves the subscription to `REFUNDED` and revokes it immediately.
 * - **Chargeback** moves the subscription to terminal `CHARGEBACK` and revokes
 *   access immediately because the funds are gone.
 *
 * Neither path deletes user data. Losing paid features is the consequence of a
 * reversal; losing your conversations is not.
 *
 * Every method is idempotent through the provider reversal id. A gateway
 * redelivering a notification cannot apply it twice.
 */
@Injectable()
export class PaymentReversalService {
  private readonly logger = new Logger(PaymentReversalService.name);

  constructor(
    private readonly lifecycle: SubscriptionLifecycleService,
    private readonly refundWebhooks: RefundWebhookService,
  ) {}

  /** Money returned to the customer at our or their request. */
  async refund(request: ReversalRequest): Promise<boolean> {
    this.logger.warn(`refund: subscription=${request.subscriptionId}`);
    return this.refundWebhooks.apply(request);
  }

  /** Funds pulled back by the card network or PayPal. A dispute. */
  async chargeback(request: ReversalRequest): Promise<boolean> {
    this.logger.error(`chargeback: subscription=${request.subscriptionId}`);
    return this.apply(
      request,
      PaymentTransactionType.CHARGEBACK,
      SubscriptionStatus.CHARGEBACK,
      EventPattern.BILLING_PAYMENT_CHARGEBACK,
    );
  }

  private async apply(
    request: ReversalRequest,
    type: PaymentTransactionType,
    status: SubscriptionStatus,
    pattern: EventPattern,
  ): Promise<boolean> {
    // Pair the reversal with the exact charge verified by the webhook handler
    // so reconciliation never guesses which payment was disputed.
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
      reversesTransactionId: request.originalTransactionId,
      invoiceId: request.invoiceId,
      status,
      pattern,
      correlationId: request.correlationId,
    });
  }
}
