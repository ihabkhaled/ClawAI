import { type InvoiceLineKind, type InvoiceStatus } from '@claw/shared-types';

export type InvoicePdfLine = {
  kind: InvoiceLineKind;
  description: string;
  quantity: number;
  amountMinor: number;
  sortOrder: number;
};

// Deliberately contains only customer-safe, immutable billing facts. There is
// no field for a database id, tenant id, provider token, or card number.
export type InvoicePdfInput = {
  number: string;
  status: InvoiceStatus;
  currency: string;
  subtotalMinor: number;
  discountMinor: number;
  taxMinor: number;
  totalMinor: number;
  amountPaidMinor: number;
  amountRefundedMinor: number;
  periodStart: Date | null;
  periodEnd: Date | null;
  issuedAt: Date;
  paidAt: Date | null;
  lines: readonly InvoicePdfLine[];
};
