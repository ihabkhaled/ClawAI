import { type Prisma } from '../../../generated/prisma';
import {
  type BillingInterval,
  type InvoiceLineKind,
  type PaymentTransactionStatus,
  type PaymentTransactionType,
} from '@claw/shared-types';

/** A payment transaction row as recorded. Amounts are integer minor units. */
export type RecordTransactionInput = {
  userId: string;
  subscriptionId: string | null;
  checkoutSessionId: string | null;
  gateway: string;
  type: PaymentTransactionType;
  status: PaymentTransactionStatus;
  /** What ClawAI intended to charge, in the canonical plan currency. */
  amountMinor: number;
  currency: string;
  /** What the provider reported. Divergence is a reconciliation finding. */
  providerAmountMinor: number | null;
  providerCurrency: string | null;
  providerTransactionId: string | null;
  providerOrderId: string | null;
  /** Scoped per user; the unique index makes a retry a no-op. */
  idempotencyKey: string;
  priceSnapshot: Prisma.InputJsonValue | null;
  fxSnapshot: Prisma.InputJsonValue | null;
  capturedAt: Date | null;
  refundedAt: Date | null;
  /** The charge this row reverses, when known. */
  reversesTransactionId: string | null;
};

/** One invoice line. Negative only for credits, discounts and refunds. */
export type InvoiceLineInput = {
  kind: InvoiceLineKind;
  description: string;
  quantity: number;
  amountMinor: number;
  sortOrder: number;
};

/** An immutable invoice plus its lines. Lines always sum to the total. */
export type CreateInvoiceInput = {
  userId: string;
  subscriptionId: string | null;
  currency: string;
  periodStart: Date | null;
  periodEnd: Date | null;
  /** Money actually received at issue time. */
  amountPaidMinor: number;
  lines: InvoiceLineInput[];
};

/** What the caller needs back after recording a charge. */
export type RecordedCharge = {
  transactionId: string;
  invoiceId: string;
  invoiceNumber: string;
};

/** Everything needed to describe a period on an invoice line. */
export type InvoicePeriodDescriptor = {
  planSlug: string;
  billingInterval: BillingInterval;
};
