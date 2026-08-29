import { type PaymentTransactionType } from '@claw/shared-types';

/**
 * A verified top-up payment, ready to become credit.
 *
 * Every figure here is resolved from OUR records — the checkout session and the
 * immutable package version it froze — never from the gateway payload. The
 * payload is only ever allowed to confirm the amount, which
 * `assertPaymentMatchesSession` does before this type is constructed.
 */
export type ActivateCreditTopupInput = {
  /** Defence in depth: a caller that has not verified cannot activate. */
  paymentVerified: boolean;
  userId: string;
  invoiceRecipientEmail: string | null;
  checkoutSessionId: string;
  gateway: string;
  packageId: string;
  packageVersionId: string;
  /** Integer micro-USD granted. Never derived from the charged amount. */
  creditMicroUsd: bigint;
  /** Canonical package-currency amount, integer minor units. */
  baseAmountMinor: number;
  baseCurrency: string;
  providerAmountMinor: number | null;
  providerCurrency: string | null;
  providerTransactionId: string | null;
  providerOrderId: string | null;
  correlationId: string;
};

export type CreditTopupActivationResult = {
  paymentTransactionId: string;
  invoiceNumber: string;
  /** Null when the charge was already recorded — a replay changed nothing. */
  outboxEventId: string | null;
};

/**
 * A refunded or charged-back top-up.
 *
 * `creditMicroUsd` is the credit the RETURNED money bought, not necessarily the
 * whole package: a partial refund reverses a proportional share. It is NOT
 * clamped against the wallet here — payment-service cannot see a balance, and
 * clamping is auth's job (ADR-083 edge case E5).
 */
export type ReverseCreditTopupInput = {
  userId: string;
  gateway: string;
  /** REFUND or CHARGEBACK. Decides the compensating row's status. */
  type: PaymentTransactionType;
  amountMinor: number;
  currency: string;
  providerAmountMinor: number | null;
  providerCurrency: string | null;
  providerTransactionId: string | null;
  idempotencyKey: string;
  /** The original CREDIT_TOPUP charge being reversed. */
  sourcePaymentTransactionId: string;
  packageId: string;
  packageVersionId: string;
  creditMicroUsd: bigint;
  invoiceId: string | null;
  correlationId: string;
};

/**
 * What a top-up charge froze onto `priceSnapshotJson`.
 *
 * Read back when the charge is reversed, so a refund reverses the credit the
 * customer was actually given rather than a figure re-derived from a package
 * that may since have been repriced or withdrawn.
 */
export type CreditTopupPriceSnapshot = {
  packageId: string;
  packageVersionId: string;
  creditMicroUsd: string;
  amountMinor: number;
  currency: string;
};
