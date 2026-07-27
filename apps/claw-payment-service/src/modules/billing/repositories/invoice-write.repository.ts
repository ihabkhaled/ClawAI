import { Injectable, Logger } from '@nestjs/common';
import { InvoiceStatus } from '@claw/shared-types';

import { type Invoice, type Prisma } from '../../../generated/prisma';
import { sumInvoiceLines } from '../utilities/invoice-total.utility';
import { type CreateInvoiceInput } from '../types/billing-record.types';

/**
 * Writes invoices. Separate from the read-only `InvoiceRepository` because the
 * read side is user-scoped query surface and this is transactional write surface
 * — keeping them apart makes it obvious that nothing in the API layer can create
 * a billing document.
 *
 * Invoices are immutable once issued. There is deliberately no `update`: a
 * correction is a NEW invoice with compensating lines, so the original document a
 * customer already received can always be reproduced exactly.
 */
@Injectable()
export class InvoiceWriteRepository {
  private readonly logger = new Logger(InvoiceWriteRepository.name);

  async create(tx: Prisma.TransactionClient, input: CreateInvoiceInput): Promise<Invoice> {
    const totals = sumInvoiceLines(input.lines);
    // PAID only when the money is already in. An invoice marked paid before
    // settlement is a document asserting something that has not happened.
    const isPaid = input.amountPaidMinor >= totals.totalMinor && totals.totalMinor > 0;
    this.logger.debug(
      `create: user=${input.userId} total=${String(totals.totalMinor)}${input.currency}`,
    );

    return tx.invoice.create({
      data: {
        number: await InvoiceWriteRepository.nextNumber(tx),
        userId: input.userId,
        subscriptionId: input.subscriptionId,
        status: isPaid ? InvoiceStatus.PAID : InvoiceStatus.OPEN,
        currency: input.currency,
        subtotalMinor: totals.subtotalMinor,
        discountMinor: totals.discountMinor,
        taxMinor: totals.taxMinor,
        totalMinor: totals.totalMinor,
        amountPaidMinor: input.amountPaidMinor,
        periodStart: input.periodStart,
        periodEnd: input.periodEnd,
        paidAt: isPaid ? new Date() : null,
        delivery:
          input.recipientEmail === null
            ? undefined
            : { create: { recipientEmail: input.recipientEmail } },
        lines: {
          create: input.lines.map((line) => ({
            kind: line.kind,
            description: line.description,
            quantity: line.quantity,
            amountMinor: line.amountMinor,
            sortOrder: line.sortOrder,
          })),
        },
      },
    });
  }

  /**
   * Records a refund against an existing invoice.
   *
   * The only permitted mutation, and it adds rather than rewrites: the refunded
   * total accumulates and the status moves to PARTIALLY_REFUNDED or REFUNDED. The
   * original lines are untouched, so the document still shows what was charged.
   */
  async applyRefund(
    tx: Prisma.TransactionClient,
    invoiceId: string,
    refundMinor: number,
  ): Promise<void> {
    const invoice = await tx.invoice.findUnique({ where: { id: invoiceId } });
    if (invoice === null) {
      return;
    }
    const refunded = invoice.amountRefundedMinor + refundMinor;
    this.logger.log(`applyRefund: invoice=${invoiceId} refunded=${String(refunded)}`);
    await tx.invoice.update({
      where: { id: invoiceId },
      data: {
        amountRefundedMinor: refunded,
        status:
          refunded >= invoice.totalMinor
            ? InvoiceStatus.REFUNDED
            : InvoiceStatus.PARTIALLY_REFUNDED,
      },
    });
  }

  /**
   * Next human-facing invoice number.
   *
   * Derived from the row count inside the same transaction, so two concurrent
   * issues cannot both read the same count — the surrounding transaction
   * serialises them. Zero-padded and prefixed so the number is recognisable in a
   * support conversation rather than being a bare integer.
   */
  private static async nextNumber(tx: Prisma.TransactionClient): Promise<string> {
    const count = await tx.invoice.count();
    return `CLAW-${String(count + 1).padStart(8, '0')}`;
  }
}
