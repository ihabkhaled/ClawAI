// A payment a gateway adapter has already verified: the money moved, and the
// amount, currency and session binding all matched what we recorded.
//
// Reaching this type is a claim that verification happened. The activation
// service still re-checks the amount against the session — the claim is a
// contract, not a substitute for the check.
export type VerifiedPayment = {
  checkoutSessionId: string;
  providerTransactionId: string;
  amountMinor: number;
  currency: string;
  // Ties the resulting entitlement event back to the webhook that caused it.
  correlationId: string;
};
