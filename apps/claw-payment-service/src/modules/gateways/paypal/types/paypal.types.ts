// Inputs are always internal, server-derived values. Nothing here is ever taken
// from a client request: the amount comes from an immutable PlanPriceVersion
// snapshot, and the identifiers bind the provider call back to our own records
// so a completed payment can be matched to exactly one checkout session.

export type PaypalCreateOrderInput = {
  // Integer minor units from the price snapshot ($5.00 => 500).
  amountMinor: number;
  currency: string;
  // Our checkout session id. Sent as custom_id so the webhook and the order
  // lookup can both be tied back to it.
  checkoutSessionId: string;
  // Idempotency key sent as PayPal-Request-Id — a retry of the same logical
  // request must not create a second order.
  idempotencyKey: string;
  returnUrl: string;
  cancelUrl: string;
  description: string;
};

export type PaypalOrderResult = {
  orderId: string;
  status: string;
  approvalUrl: string | null;
};

// The verdict the service acts on. `verified` is true ONLY when the money
// actually moved AND the amount, currency and session binding all match what we
// recorded — any mismatch is a refusal, never a warning.
export type PaypalCaptureVerification = {
  verified: boolean;
  captureId: string | null;
  status: string;
  amountMinor: number | null;
  currency: string | null;
  checkoutSessionId: string | null;
  mismatchReason: PaypalMismatchReason | null;
};

export type PaypalMismatchReason =
  'NOT_TERMINAL' | 'AMOUNT_MISMATCH' | 'CURRENCY_MISMATCH' | 'SESSION_MISMATCH' | 'NO_CAPTURE';

export type PaypalWebhookHeaders = {
  transmissionId: string;
  transmissionTime: string;
  transmissionSig: string;
  certUrl: string;
  authAlgo: string;
};

export type PaypalSubscriptionResult = {
  subscriptionId: string;
  status: string;
  isActive: boolean;
  nextBillingTime: string | null;
  checkoutSessionId: string | null;
};

export type PaypalRefundResult = {
  refundId: string;
  status: string;
};

export type PaypalRequestContext = {
  // Correlates gateway calls with the request that caused them, without ever
  // logging payer details or response bodies.
  requestId: string;
};
