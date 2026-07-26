// Paymob REST surface. Only paymob.adapter.ts may use these.

export const PAYMOB_BASE_URL = 'https://accept.paymob.com';

export const PAYMOB_PATHS = {
  INTENTION: '/v1/intention/',
  TRANSACTION: '/api/acceptance/transactions',
  REFUND: '/api/acceptance/void_refund/refund',
} as const;

// Paymob computes the callback HMAC over these fields, concatenated in EXACTLY
// this order with no separator. The order is part of the protocol — sorting or
// reordering them produces a different digest and every genuine callback then
// fails verification.
export const PAYMOB_HMAC_FIELD_ORDER: ReadonlyArray<string> = [
  'amount_cents',
  'created_at',
  'currency',
  'error_occured',
  'has_parent_transaction',
  'id',
  'integration_id',
  'is_3d_secure',
  'is_auth',
  'is_capture',
  'is_refunded',
  'is_standalone_payment',
  'is_voided',
  'order.id',
  'owner',
  'pending',
  'source_data.pan',
  'source_data.sub_type',
  'source_data.type',
  'success',
];

export const PAYMOB_HMAC_ALGORITHM = 'sha512';

// A transaction only counts as paid when success is true AND none of the
// reversal flags are set. Checking `success` alone would accept a payment that
// was subsequently voided or refunded.
export const PAYMOB_REVERSAL_FLAGS: ReadonlyArray<string> = [
  'is_refunded',
  'is_voided',
  'error_occured',
];

export const PAYMOB_RETRYABLE_STATUS_CODES: ReadonlyArray<number> = [408, 429, 500, 502, 503, 504];
export const PAYMOB_MAX_RETRY_ATTEMPTS = 3;
export const PAYMOB_RETRY_BASE_DELAY_MS = 250;

// Paymob's hosted card-tokenization flow requires an intention even when no
// purchase is taking place. Zero explicitly means "vault only": no amount is
// persisted locally and no transaction may enter subscription activation.
export const PAYMOB_SETUP_AMOUNT_MINOR = 0;
export const PAYMOB_SETUP_DESCRIPTION = 'ClawAI saved payment method';
