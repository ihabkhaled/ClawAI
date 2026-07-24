import type { InvoiceLineKind } from '../enums/invoice-line-kind.enum';
import type { InvoiceStatus } from '../enums/invoice-status.enum';

export type InvoiceLineView = {
  id: string;
  kind: InvoiceLineKind;
  description: string;
  quantity: number;
  // Negative only for PRORATION_CREDIT / DISCOUNT / REFUND lines.
  amountMinor: number;
};

// Immutable billing document. Lines always sum to totalMinor.
export type InvoiceView = {
  id: string;
  number: string;
  subscriptionId: string | null;
  status: InvoiceStatus;
  currency: string;
  subtotalMinor: number;
  discountMinor: number;
  taxMinor: number;
  totalMinor: number;
  amountPaidMinor: number;
  amountRefundedMinor: number;
  periodStart: string | null;
  periodEnd: string | null;
  issuedAt: string;
  paidAt: string | null;
  lines: InvoiceLineView[];
};
