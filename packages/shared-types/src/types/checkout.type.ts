import type { BillingGateway } from '../enums/billing-gateway.enum';
import type { BillingInterval } from '../enums/billing-interval.enum';
import type { CheckoutPurpose } from '../enums/checkout-purpose.enum';
import type { CheckoutSessionStatus } from '../enums/checkout-session-status.enum';

// What the browser is allowed to know about a checkout session.
//
// `chargeAmountMinor` / `chargeCurrency` are the SERVER-CALCULATED totals the
// gateway will actually charge (already FX-converted for Paymob). They are shown
// for confirmation only — resubmitting them has no effect, because the server
// re-derives the amount from the bound price version on every verification.
export type CheckoutSessionView = {
  id: string;
  status: CheckoutSessionStatus;
  purpose: CheckoutPurpose;
  gateway: BillingGateway;
  planId: string;
  planSlug: string;
  billingInterval: BillingInterval;
  // Canonical USD price of the plan version being bought.
  baseAmountMinor: number;
  baseCurrency: string;
  chargeAmountMinor: number;
  chargeCurrency: string;
  expiresAt: string;
  // Gateway-specific handoff the frontend needs to start the hosted flow:
  // PayPal order id, or Paymob unified-checkout URL. Never a secret.
  gatewayHandoff: CheckoutGatewayHandoff | null;
};

export type CheckoutGatewayHandoff = {
  // PayPal: the order/subscription id the JS SDK resumes. Paymob: null.
  providerOrderId: string | null;
  // Paymob: the hosted Unified Checkout URL. PayPal: null.
  hostedCheckoutUrl: string | null;
  // Opaque nonce echoed back by the return page; bound to the session row.
  stateNonce: string;
};
