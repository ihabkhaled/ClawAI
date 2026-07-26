import { type BillingGateway, type BillingInterval } from '@claw/shared-types';

// The userId is threaded in from the verified JWT by the controller. It is
// never part of the request body: a client that could name a userId could buy a
// subscription for somebody else, or worse, attribute its own to them.
export type StartCheckoutInput = {
  userId: string;
  userEmail: string;
  planId: string;
  billingInterval: BillingInterval;
  gateway: BillingGateway;
  idempotencyKey: string;
};

// What the browser is told. Deliberately excludes the state nonce, the FX quote
// internals and the price version id — the client needs none of them, and each
// is one more thing an attacker could try to influence.
export type CheckoutSessionView = {
  id: string;
  status: string;
  gateway: string;
  chargeAmountMinor: number;
  chargeCurrency: string;
  hostedCheckoutUrl: string | null;
  expiresAt: string;
};

// Server-resolved money for a checkout. Produced from an immutable price
// version plus, for a non-USD gateway, a bound FX quote.
export type ResolvedCharge = {
  planPriceVersionId: string;
  baseAmountMinor: number;
  baseCurrency: string;
  chargeAmountMinor: number;
  chargeCurrency: string;
  fxQuoteId: string | null;
  fxFinalRateScaled: number | null;
};
