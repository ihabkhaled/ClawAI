import { Injectable, Logger } from '@nestjs/common';
import { PaymentTransactionStatus, PaymentTransactionType } from '@claw/shared-types';

import { type PaymentTransaction, type Prisma } from '../../../generated/prisma';
import { InvoiceWriteRepository } from '../repositories/invoice-write.repository';
import { PaymentTransactionRepository } from '../repositories/payment-transaction.repository';
import {
  type RecordChargeInput,
  type RecordReversalInput,
} from '../types/billing-record-service.types';
import { type RecordedCharge } from '../types/billing-record.types';
import { resolveChargeLineKind } from '../utilities/charge-line-kind.utility';

/**
 * Writes the money side of a billing event: the payment transaction and the
 * invoice.
 *
 * Both take a caller-supplied `tx`, so the financial record is committed in the
 * SAME database transaction as the subscription state it describes. Without that,
 * a crash between the two leaves either a subscription nobody was billed for or a
 * charge against a subscription that does not exist — and both are worse than the
 * whole operation failing.
 *
 * Idempotency comes from two unique indexes rather than from application checks:
 * `(gateway, providerTransactionId)` makes a duplicate capture or refund
 * impossible under retry, and `(userId, idempotencyKey)` makes a replayed request
 * a no-op. Relying on a read-then-write check instead would leave a race.
 */
@Injectable()
export class BillingRecordService {
  private readonly logger = new Logger(BillingRecordService.name);

  constructor(
    private readonly transactions: PaymentTransactionRepository,
    private readonly invoices: InvoiceWriteRepository,
  ) {}

  /**
   * Records a captured charge and issues the invoice that documents it.
   *
   * `subscriptionId` is nullable because a PAYG credit top-up is a real
   * purchase with a real invoice and NO subscription. Passing a sentinel
   * subscription instead would put a fabricated plan purchase in the ledger.
   */
  async recordCharge(
    tx: Prisma.TransactionClient,
    input: RecordChargeInput,
  ): Promise<RecordedCharge> {
    this.logger.debug(`recordCharge: subscription=${input.subscriptionId ?? 'none'}`);
    const transaction = await this.recordCapturedTransaction(tx, input);
    const invoice = await this.invoices.create(tx, {
      userId: input.userId,
      recipientEmail: input.invoiceRecipientEmail,
      subscriptionId: input.subscriptionId,
      currency: input.currency,
      periodStart: input.periodStart,
      periodEnd: input.periodEnd,
      amountPaidMinor: input.amountMinor,
      lines: [
        {
          kind: resolveChargeLineKind(input.type),
          description: input.lineDescription,
          quantity: 1,
          amountMinor: input.amountMinor,
          sortOrder: 0,
        },
      ],
    });

    this.logger.log(
      `recordCharge: transaction=${transaction.id} invoice=${invoice.number} ` +
        `amount=${String(input.amountMinor)}${input.currency}`,
    );
    return { transactionId: transaction.id, invoiceId: invoice.id, invoiceNumber: invoice.number };
  }

  private async recordCapturedTransaction(
    tx: Prisma.TransactionClient,
    input: RecordChargeInput,
  ): Promise<PaymentTransaction> {
    return this.transactions.record(tx, {
      userId: input.userId,
      subscriptionId: input.subscriptionId,
      checkoutSessionId: input.checkoutSessionId,
      gateway: input.gateway,
      type: input.type,
      status: PaymentTransactionStatus.CAPTURED,
      amountMinor: input.amountMinor,
      currency: input.currency,
      providerAmountMinor: input.providerAmountMinor,
      providerCurrency: input.providerCurrency,
      providerTransactionId: input.providerTransactionId,
      providerOrderId: input.providerOrderId,
      idempotencyKey: input.idempotencyKey,
      priceSnapshot: input.priceSnapshot,
      fxSnapshot: input.fxSnapshot,
      capturedAt: new Date(),
      refundedAt: null,
      reversesTransactionId: null,
    });
  }

  /**
   * Records a refund or chargeback as a compensating row.
   *
   * The amount is stored NEGATIVE so the transaction ledger sums to the net
   * position without the reader having to know which types are credits. The
   * reversed charge is linked when we can identify it, which is what lets a
   * reconciliation job pair a reversal with what it offsets.
   *
   * Returns null when this provider transaction was already recorded — a
   * redelivered webhook must not produce a second refund row.
   */
  async recordReversal(
    tx: Prisma.TransactionClient,
    input: RecordReversalInput,
  ): Promise<string | null> {
    const existing =
      input.providerTransactionId === null
        ? null
        : await this.transactions.findByProviderTransactionId(
            input.gateway,
            input.providerTransactionId,
          );
    if (existing !== null) {
      this.logger.warn(
        `recordReversal: provider transaction already recorded — ignoring replay ` +
          `gateway=${input.gateway}`,
      );
      return null;
    }

    const isChargeback = input.type === PaymentTransactionType.CHARGEBACK;
    const transaction = await this.transactions.record(tx, {
      userId: input.userId,
      subscriptionId: input.subscriptionId,
      checkoutSessionId: null,
      gateway: input.gateway,
      type: input.type,
      status: isChargeback ? PaymentTransactionStatus.REVERSED : PaymentTransactionStatus.REFUNDED,
      amountMinor: -Math.abs(input.amountMinor),
      currency: input.currency,
      providerAmountMinor:
        input.providerAmountMinor === null ? null : -Math.abs(input.providerAmountMinor),
      providerCurrency: input.providerCurrency,
      providerTransactionId: input.providerTransactionId,
      providerOrderId: null,
      idempotencyKey: input.idempotencyKey,
      priceSnapshot: null,
      fxSnapshot: null,
      capturedAt: null,
      refundedAt: new Date(),
      reversesTransactionId: input.reversesTransactionId,
    });

    if (input.invoiceId !== null) {
      await this.invoices.applyRefund(tx, input.invoiceId, Math.abs(input.amountMinor));
    }

    this.logger.warn(
      `recordReversal: ${input.type} transaction=${transaction.id} ` +
        `amount=${String(input.amountMinor)}${input.currency}`,
    );
    return transaction.id;
  }
}
