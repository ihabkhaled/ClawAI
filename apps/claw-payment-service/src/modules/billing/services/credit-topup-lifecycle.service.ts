import { Injectable, Logger } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import {
  type BillingCreditTopupReversedPayload,
  type BillingCreditTopupSucceededPayload,
  BillingErrorCode,
  CheckoutSessionStatus,
  EventPattern,
  PaymentTransactionType,
} from '@claw/shared-types';

import { BillingException } from '../../../common/errors';
import { PrismaService } from '../../../infrastructure/database/prisma/prisma.service';
import { OutboxRepository } from '../../outbox/repositories/outbox.repository';
import { BILLING_EVENT_SCHEMA_VERSION, PAYMENT_PRODUCER } from '../constants/billing.constants';
import { BillingRecordService } from './billing-record.service';
import {
  type ActivateCreditTopupInput,
  type CreditTopupActivationResult,
  type ReverseCreditTopupInput,
} from '../types/credit-topup-lifecycle.types';
import { type Prisma } from '../../../generated/prisma';

/**
 * Commits a PAYG credit purchase — the charge, the invoice and the event that
 * grants the credit — in ONE database transaction.
 *
 * The exact shape of `SubscriptionLifecycleService`, and for the exact same
 * reason: publishing the event outside the transaction would mean a crash
 * between commit and publish leaves a customer who paid with no credit, or
 * credit with no payment behind it. The outbox row is written transactionally
 * and a separate poller drains it, so the two can never disagree.
 *
 * What it deliberately does NOT do is touch a subscription. A top-up buys a
 * wallet balance, not an entitlement. ADR-064's refund policy is about paid
 * access; a credit reversal has nothing to revoke and must revoke nothing.
 */
@Injectable()
export class CreditTopupLifecycleService {
  private readonly logger = new Logger(CreditTopupLifecycleService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly outbox: OutboxRepository,
    private readonly records: BillingRecordService,
  ) {}

  async activateFromVerifiedPayment(
    input: ActivateCreditTopupInput,
  ): Promise<CreditTopupActivationResult> {
    this.logger.debug(`activateFromVerifiedPayment: session=${input.checkoutSessionId}`);
    if (!input.paymentVerified) {
      // Defence in depth. The only current caller verifies first, but a future
      // one must not be able to mint credit simply by not checking.
      this.logger.error('activateFromVerifiedPayment: refused — payment was not verified');
      throw new BillingException(BillingErrorCode.PAYMENT_NOT_VERIFIED);
    }

    return this.prisma.$transaction(async (tx) => {
      await tx.checkoutSession.update({
        where: { id: input.checkoutSessionId },
        data: {
          status: CheckoutSessionStatus.COMPLETED,
          verifiedAt: new Date(),
          completedAt: new Date(),
        },
      });

      const charge = await this.recordTopupCharge(tx, input);
      const outboxEventId = await this.enqueueGrant(tx, input, charge.transactionId);

      this.logger.log(
        `activateFromVerifiedPayment: transaction=${charge.transactionId} ` +
          `invoice=${charge.invoiceNumber} from session=${input.checkoutSessionId}`,
      );
      return {
        paymentTransactionId: charge.transactionId,
        invoiceNumber: charge.invoiceNumber,
        outboxEventId,
      };
    });
  }

  /**
   * Reverses a top-up: the compensating money row and the reversal event, in
   * one transaction.
   *
   * Returns false when the provider reversal was already recorded, so a
   * redelivered chargeback notification is a no-op rather than a second debit
   * of the wallet.
   */
  async reverseCreditTopup(input: ReverseCreditTopupInput): Promise<boolean> {
    this.logger.warn(`reverseCreditTopup: source=${input.sourcePaymentTransactionId}`);
    return this.prisma.$transaction(async (tx) => {
      const reversalId = await this.records.recordReversal(tx, {
        userId: input.userId,
        subscriptionId: null,
        gateway: input.gateway,
        type: input.type,
        amountMinor: input.amountMinor,
        currency: input.currency,
        providerAmountMinor: input.providerAmountMinor,
        providerCurrency: input.providerCurrency,
        providerTransactionId: input.providerTransactionId,
        idempotencyKey: input.idempotencyKey,
        reversesTransactionId: input.sourcePaymentTransactionId,
        invoiceId: input.invoiceId,
      });
      if (reversalId === null) {
        return false;
      }
      await this.enqueueReversal(tx, input, reversalId);
      return true;
    });
  }

  /**
   * Enqueues the reversal event for a refund that a caller has already
   * recorded, inside that caller's transaction.
   *
   * Exists because the operator refund path writes its own compensating row via
   * `RefundCompletionService`; re-recording it here would be a second refund.
   */
  async enqueueReversalInTransaction(
    tx: Prisma.TransactionClient,
    input: ReverseCreditTopupInput,
    reversalTransactionId: string,
  ): Promise<void> {
    await this.enqueueReversal(tx, input, reversalTransactionId);
  }

  private async recordTopupCharge(
    tx: Prisma.TransactionClient,
    input: ActivateCreditTopupInput,
  ): Promise<{ transactionId: string; invoiceNumber: string }> {
    const charge = await this.records.recordCharge(tx, {
      userId: input.userId,
      invoiceRecipientEmail: input.invoiceRecipientEmail,
      // No subscription: a top-up buys a balance, not a plan.
      subscriptionId: null,
      checkoutSessionId: input.checkoutSessionId,
      gateway: input.gateway,
      type: PaymentTransactionType.CREDIT_TOPUP,
      amountMinor: input.baseAmountMinor,
      currency: input.baseCurrency,
      providerAmountMinor: input.providerAmountMinor,
      providerCurrency: input.providerCurrency,
      providerTransactionId: input.providerTransactionId,
      providerOrderId: input.providerOrderId,
      // Scoped to the checkout session: a replayed activation for the same
      // session collides on (userId, idempotencyKey) instead of double-billing.
      idempotencyKey: `credit-topup:${input.checkoutSessionId}`,
      // Frozen so a later refund reverses the credit the customer was ACTUALLY
      // given, not a figure re-derived from a package that may since have been
      // repriced or withdrawn. Serialised as a string: JSON has no BigInt.
      priceSnapshot: {
        packageId: input.packageId,
        packageVersionId: input.packageVersionId,
        creditMicroUsd: input.creditMicroUsd.toString(),
        amountMinor: input.baseAmountMinor,
        currency: input.baseCurrency,
      },
      fxSnapshot: null,
      // A top-up covers no period. Leaving these null is what keeps the invoice
      // from implying a subscription term nobody bought.
      periodStart: null,
      periodEnd: null,
      lineDescription: `PAYG credit — ${input.packageId}`,
    });
    return { transactionId: charge.transactionId, invoiceNumber: charge.invoiceNumber };
  }

  private async enqueueGrant(
    tx: Prisma.TransactionClient,
    input: ActivateCreditTopupInput,
    paymentTransactionId: string,
  ): Promise<string> {
    const eventId = randomUUID();
    const occurredAt = new Date().toISOString();
    const payload: BillingCreditTopupSucceededPayload = {
      eventId,
      schemaVersion: BILLING_EVENT_SCHEMA_VERSION,
      producer: PAYMENT_PRODUCER,
      causationId: input.checkoutSessionId,
      correlationId: input.correlationId,
      occurredAt,
      userId: input.userId,
      creditMicroUsd: input.creditMicroUsd.toString(),
      packageId: input.packageId,
      packageVersionId: input.packageVersionId,
      paymentTransactionId,
      amountMinor: input.baseAmountMinor,
      currency: input.baseCurrency,
    };
    await this.outbox.enqueue(tx, {
      pattern: EventPattern.BILLING_CREDIT_TOPUP_SUCCEEDED,
      eventId,
      aggregateType: 'CreditTopup',
      aggregateId: paymentTransactionId,
      payloadJson: payload,
    });
    return eventId;
  }

  private async enqueueReversal(
    tx: Prisma.TransactionClient,
    input: ReverseCreditTopupInput,
    reversalTransactionId: string,
  ): Promise<void> {
    const eventId = randomUUID();
    const occurredAt = new Date().toISOString();
    const payload: BillingCreditTopupReversedPayload = {
      eventId,
      schemaVersion: BILLING_EVENT_SCHEMA_VERSION,
      producer: PAYMENT_PRODUCER,
      causationId: reversalTransactionId,
      correlationId: input.correlationId,
      occurredAt,
      userId: input.userId,
      creditMicroUsd: input.creditMicroUsd.toString(),
      packageId: input.packageId,
      packageVersionId: input.packageVersionId,
      sourcePaymentTransactionId: input.sourcePaymentTransactionId,
      paymentTransactionId: reversalTransactionId,
      amountMinor: input.amountMinor,
      currency: input.currency,
      isChargeback: input.type === PaymentTransactionType.CHARGEBACK,
    };
    await this.outbox.enqueue(tx, {
      pattern: EventPattern.BILLING_CREDIT_TOPUP_REVERSED,
      eventId,
      aggregateType: 'CreditTopup',
      aggregateId: input.sourcePaymentTransactionId,
      payloadJson: payload,
    });
  }
}
