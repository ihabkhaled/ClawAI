import { type BillingGateway } from '@claw/shared-types';

/**
 * Server-resolved money for a credit top-up.
 *
 * `creditMicroUsd` and the amounts are independent by design: the gap between
 * them is the platform's margin, it lives in one immutable database row, and
 * nothing in this service is permitted to reconstruct one from the other.
 */
export type ResolvedCreditCharge = {
  packageId: string;
  packageSlug: string;
  /** The IMMUTABLE priced version. Frozen onto the session and the invoice. */
  packageVersionId: string;
  /** Integer micro-USD of credit bought. Never affected by FX. */
  creditMicroUsd: bigint;
  baseAmountMinor: number;
  baseCurrency: string;
  chargeAmountMinor: number;
  chargeCurrency: string;
  fxQuoteId: string | null;
  fxFinalRateScaled: number | null;
};

/**
 * What starting a top-up checkout takes.
 *
 * Note what is absent: no amount, no currency, no credit figure, no userId. The
 * identity is threaded in from the verified JWT and every number is resolved
 * server-side from the package version. A client that could name its own amount
 * could buy $100 of credit for a cent.
 */
export type StartCreditTopupInput = {
  userId: string;
  userEmail: string;
  packageId: string;
  gateway: BillingGateway;
  idempotencyKey: string;
};

/**
 * What the browser is told about a top-up checkout.
 *
 * Mirrors `CheckoutSessionView` and adds the credit figure, because "what am I
 * buying" is the one thing a top-up confirmation page must show that a plan
 * checkout does not. Still excludes the state nonce, the FX internals and the
 * package version id.
 */
export type CreditTopupSessionView = {
  id: string;
  status: string;
  gateway: string;
  chargeAmountMinor: number;
  chargeCurrency: string;
  /** Integer micro-USD. Serialised as a number; a package is far below 2^53. */
  creditMicroUsd: number;
  hostedCheckoutUrl: string | null;
  expiresAt: string;
};
