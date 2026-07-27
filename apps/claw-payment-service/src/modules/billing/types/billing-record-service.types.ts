import { type PaymentTransactionType } from '@claw/shared-types';

import { type Prisma } from '../../../generated/prisma';

/** A captured charge plus everything the invoice documenting it needs. */
export type RecordChargeInput = {
  userId: string;
  invoiceRecipientEmail: string | null;
  subscriptionId: string;
  checkoutSessionId: string | null;
  gateway: string;
  type: PaymentTransactionType;
  /** Canonical plan currency amount, integer minor units. */
  amountMinor: number;
  currency: string;
  providerAmountMinor: number | null;
  providerCurrency: string | null;
  providerTransactionId: string | null;
  providerOrderId: string | null;
  idempotencyKey: string;
  priceSnapshot: Prisma.InputJsonValue | null;
  fxSnapshot: Prisma.InputJsonValue | null;
  periodStart: Date | null;
  periodEnd: Date | null;
  /** Human-readable invoice line, e.g. "Pro plan — monthly". */
  lineDescription: string;
};

/** A refund or chargeback. `amountMinor` is given positive and stored negative. */
export type RecordReversalInput = {
  userId: string;
  subscriptionId: string | null;
  gateway: string;
  type: PaymentTransactionType;
  amountMinor: number;
  currency: string;
  providerAmountMinor: number | null;
  providerCurrency: string | null;
  providerTransactionId: string | null;
  idempotencyKey: string;
  /** The charge being reversed, when identifiable. */
  reversesTransactionId: string | null;
  /** The invoice to mark refunded, when identifiable. */
  invoiceId: string | null;
};
