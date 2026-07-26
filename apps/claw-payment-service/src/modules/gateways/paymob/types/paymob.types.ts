export type PaymobIntentionInput = {
  // Already converted to the charge currency and bound to the checkout session.
  // Never taken from a client request.
  amountMinor: number;
  currency: string;
  checkoutSessionId: string;
  idempotencyKey: string;
  billingEmail: string;
  description: string;
};

export type PaymobIntentionResult = {
  intentionId: string;
  clientSecret: string;
};

export type PaymobSetupIntentionInput = {
  checkoutSessionId: string;
  billingEmail: string;
};

export type PaymobVerificationResult = {
  verified: boolean;
  transactionId: string | null;
  amountMinor: number | null;
  currency: string | null;
  checkoutSessionId: string | null;
  mismatchReason: PaymobMismatchReason | null;
};

export type PaymobMismatchReason =
  | 'HMAC_INVALID'
  | 'NOT_SUCCESSFUL'
  | 'REVERSED'
  | 'PENDING'
  | 'AMOUNT_MISMATCH'
  | 'CURRENCY_MISMATCH'
  | 'SESSION_MISMATCH';

// Only the gateway's own token and masked metadata. There is deliberately no
// field here that could hold a PAN, CVV or 3-D Secure challenge value.
export type PaymobSavedCard = {
  gatewayToken: string;
  maskedPan: string;
  brand: string | null;
};
