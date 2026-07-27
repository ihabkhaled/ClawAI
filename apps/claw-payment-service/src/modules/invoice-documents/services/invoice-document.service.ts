import { HttpStatus, Injectable } from '@nestjs/common';
import { BillingErrorCode } from '@claw/shared-types';

import { BillingException } from '../../../common/errors/billing.exception';
import { type InvoicePdfInput } from '../../../common/types/invoice-pdf.types';
import { renderInvoicePdf } from '../../../common/utilities/invoice-pdf.utility';
import { InvoiceDocumentRepository } from '../repositories/invoice-document.repository';
import {
  type InvoiceWithLines,
  type RenderedInvoiceDocument,
} from '../types/invoice-document.types';

@Injectable()
export class InvoiceDocumentService {
  constructor(private readonly repository: InvoiceDocumentRepository) {}

  async renderOwned(userId: string, invoiceId: string): Promise<RenderedInvoiceDocument> {
    const invoice = await this.repository.findOwnedWithLines(userId, invoiceId);
    return this.renderOrThrow(invoice);
  }

  async renderByInvoiceId(invoiceId: string): Promise<RenderedInvoiceDocument> {
    const invoice = await this.repository.findByIdWithLines(invoiceId);
    return this.renderOrThrow(invoice);
  }

  private async renderOrThrow(invoice: InvoiceWithLines | null): Promise<RenderedInvoiceDocument> {
    if (invoice === null) {
      throw new BillingException(BillingErrorCode.INVOICE_NOT_FOUND, HttpStatus.NOT_FOUND);
    }
    return {
      bytes: await renderInvoicePdf(InvoiceDocumentService.toSafeInput(invoice)),
      filename: `${invoice.number}.pdf`,
    };
  }

  private static toSafeInput(invoice: InvoiceWithLines): InvoicePdfInput {
    return {
      number: invoice.number,
      status: invoice.status as InvoicePdfInput['status'],
      currency: invoice.currency,
      subtotalMinor: invoice.subtotalMinor,
      discountMinor: invoice.discountMinor,
      taxMinor: invoice.taxMinor,
      totalMinor: invoice.totalMinor,
      amountPaidMinor: invoice.amountPaidMinor,
      amountRefundedMinor: invoice.amountRefundedMinor,
      periodStart: invoice.periodStart,
      periodEnd: invoice.periodEnd,
      issuedAt: invoice.issuedAt,
      paidAt: invoice.paidAt,
      lines: invoice.lines.map((line) => ({
        kind: line.kind as InvoicePdfInput['lines'][number]['kind'],
        description: line.description,
        quantity: line.quantity,
        amountMinor: line.amountMinor,
        sortOrder: line.sortOrder,
      })),
    };
  }
}
