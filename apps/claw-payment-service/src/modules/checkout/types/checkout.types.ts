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

export type PaymentMethodSetupSessionView = {
  id: string;
  status: string;
  gateway: string;
  hostedCheckoutUrl: string | null;
  expiresAt: string;
};

export type StartPaymentMethodSetupInput = {
  userId: string;
  userEmail: string;
  idempotencyKey: string;
  consentToStore: true;
};

// The minimum a gateway order needs from its caller. Narrower than the full
// start input so the upgrade path can reuse it without inventing a plan id it
// does not have.
export type GatewayOrderContext = {
  gateway: BillingGateway;
  userEmail: string;
};

// An upgrade checkout. The amount comes from a CONSUMED proration quote, not
// from the plan's full price and never from the request body — the customer
// agreed to exactly this prorated figure.
export type StartPlanChangeCheckoutInput = {
  userId: string;
  userEmail: string;
  subscriptionId: string;
  prorationQuoteId: string;
  targetPlanId: string;
  targetPlanSlug: string;
  targetPriceVersionId: string;
  // Typed as string, not BillingInterval: it round-trips through a database
  // column on the proration quote, and pretending otherwise would need a cast.
  billingInterval: string;
  gateway: BillingGateway;
  amountDueMinor: number;
  currency: string;
  idempotencyKey: string;
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
