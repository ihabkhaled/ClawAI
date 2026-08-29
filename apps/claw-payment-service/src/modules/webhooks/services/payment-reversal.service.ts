import { HttpStatus, Injectable, Logger } from '@nestjs/common';
import {
  BillingErrorCode,
  EventPattern,
  PaymentTransactionType,
  SubscriptionStatus,
} from '@claw/shared-types';

import { BillingException } from '../../../common/errors';
import { SubscriptionLifecycleService } from '../../billing/services/subscription-lifecycle.service';
import { CreditTopupLifecycleService } from '../../billing/services/credit-topup-lifecycle.service';
import { PaymentTransactionRepository } from '../../billing/repositories/payment-transaction.repository';
import {
  proportionalCreditMicroUsd,
  readCreditTopupSnapshot,
} from '../../billing/utilities/credit-topup-snapshot.utility';
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
    private readonly creditTopups: CreditTopupLifecycleService,
    private readonly transactions: PaymentTransactionRepository,
  ) {}

  /**
   * Money returned to the customer at our or their request.
   *
   * A top-up refund goes down the SAME path: `RefundWebhookService` reserves
   * and completes the refund, and `RefundCompletionService` enqueues the credit
   * reversal instead of an entitlement event because the charge has no
   * subscription. One reversal ledger, two meanings.
   */
  async refund(request: ReversalRequest): Promise<boolean> {
    this.logger.warn(`refund: subscription=${request.subscriptionId ?? 'none'}`);
    return this.refundWebhooks.apply(request);
  }

  /**
   * Funds pulled back by the card network or PayPal. A dispute.
   *
   * A disputed CREDIT_TOPUP debits the wallet and leaves the plan alone. That
   * is not a softening of ADR-064: the money in dispute never bought access, so
   * there is no access to take away, and revoking a plan the customer is
   * separately paying for would be theft in the other direction.
   */
  async chargeback(request: ReversalRequest): Promise<boolean> {
    this.logger.error(`chargeback: subscription=${request.subscriptionId ?? 'none'}`);
    if (request.subscriptionId === null) {
      return this.chargebackCreditTopup(request);
    }
    return this.apply(
      request,
      request.subscriptionId,
      PaymentTransactionType.CHARGEBACK,
      SubscriptionStatus.CHARGEBACK,
      EventPattern.BILLING_PAYMENT_CHARGEBACK,
    );
  }

  private async chargebackCreditTopup(request: ReversalRequest): Promise<boolean> {
    const charge = await this.transactions.findById(request.originalTransactionId);
    const snapshot =
      charge === null || charge.type !== PaymentTransactionType.CREDIT_TOPUP
        ? null
        : readCreditTopupSnapshot(charge.priceSnapshotJson);
    if (charge === null || snapshot === null) {
      // The funds are already gone. Refusing loudly is right: silently
      // succeeding would leave a disputed top-up with the credit still spendable.
      this.logger.error(
        `chargebackCreditTopup: unreadable top-up charge=${request.originalTransactionId}`,
      );
      throw new BillingException(BillingErrorCode.PAYMENT_REFERENCE_MISMATCH, HttpStatus.CONFLICT);
    }
    return this.creditTopups.reverseCreditTopup({
      userId: request.userId,
      gateway: request.gateway,
      type: PaymentTransactionType.CHARGEBACK,
      amountMinor: request.amountMinor,
      currency: request.currency,
      providerAmountMinor: request.providerAmountMinor,
      providerCurrency: request.providerCurrency,
      providerTransactionId: request.providerTransactionId,
      idempotencyKey: `chargeback:${request.providerTransactionId ?? charge.id}`,
      sourcePaymentTransactionId: charge.id,
      packageId: snapshot.packageId,
      packageVersionId: snapshot.packageVersionId,
      creditMicroUsd: proportionalCreditMicroUsd(
        BigInt(snapshot.creditMicroUsd),
        request.amountMinor,
        charge.amountMinor,
      ),
      invoiceId: request.invoiceId,
      correlationId: request.correlationId,
    });
  }

  private async apply(
    request: ReversalRequest,
    subscriptionId: string,
    type: PaymentTransactionType,
    status: SubscriptionStatus,
    pattern: EventPattern,
  ): Promise<boolean> {
    // Pair the reversal with the exact charge verified by the webhook handler
    // so reconciliation never guesses which payment was disputed.
    return this.lifecycle.reverseAndRevoke({
      subscriptionId,
      userId: request.userId,
      gateway: request.gateway,
      type,
      amountMinor: request.amountMinor,
      currency: request.currency,
      providerAmountMinor: request.providerAmountMinor,
      providerCurrency: request.providerCurrency,
      providerTransactionId: request.providerTransactionId,
      idempotencyKey: `${type.toLowerCase()}:${request.providerTransactionId ?? subscriptionId}`,
      reversesTransactionId: request.originalTransactionId,
      invoiceId: request.invoiceId,
      status,
      pattern,
      correlationId: request.correlationId,
    });
  }
}
