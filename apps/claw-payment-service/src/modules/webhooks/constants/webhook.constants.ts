// PayPal event types this service acts on. Anything else is recorded and
// IGNORED rather than guessed at — a webhook we do not understand must never
// take a financial action by default.
export const PAYPAL_HANDLED_EVENTS = {
  CAPTURE_COMPLETED: 'PAYMENT.CAPTURE.COMPLETED',
  CAPTURE_DENIED: 'PAYMENT.CAPTURE.DENIED',
  CAPTURE_REFUNDED: 'PAYMENT.CAPTURE.REFUNDED',
  CAPTURE_REVERSED: 'PAYMENT.CAPTURE.REVERSED',
  // Subscription lifecycle. ClawAI currently drives purchases through the Orders
  // API, so these arrive only for merchants who have also enabled PayPal-native
  // billing plans. They are handled rather than ignored because an ACTIVATED or
  // CANCELLED subscription we did not react to is an entitlement drifting away
  // from what the customer is actually paying for.
  SUBSCRIPTION_ACTIVATED: 'BILLING.SUBSCRIPTION.ACTIVATED',
  SUBSCRIPTION_UPDATED: 'BILLING.SUBSCRIPTION.UPDATED',
  SUBSCRIPTION_CANCELLED: 'BILLING.SUBSCRIPTION.CANCELLED',
  SUBSCRIPTION_SUSPENDED: 'BILLING.SUBSCRIPTION.SUSPENDED',
  SUBSCRIPTION_PAYMENT_FAILED: 'BILLING.SUBSCRIPTION.PAYMENT.FAILED',
  // Vault. Recorded for the audit trail; ClawAI stores a gateway token and masked
  // metadata only, and never advertises saved cards until the merchant account
  // supports them.
  VAULT_TOKEN_CREATED: 'VAULT.PAYMENT-TOKEN.CREATED',
  VAULT_TOKEN_DELETED: 'VAULT.PAYMENT-TOKEN.DELETED',
} as const;

/**
 * Reversal events, mapped to the kind of reversal they represent.
 *
 * REFUNDED is money we or the customer chose to return; REVERSED is money the
 * network took back over a dispute. The distinction drives a different
 * subscription status, so it is data here rather than an `if` in the handler.
 */
export const PAYPAL_REVERSAL_EVENTS: ReadonlyArray<string> = [
  'PAYMENT.CAPTURE.REFUNDED',
  'PAYMENT.CAPTURE.REVERSED',
];

// Paymob posts a single transaction callback rather than typed events, so the
// type is synthesised for the audit row.
export const PAYMOB_TRANSACTION_EVENT = 'TRANSACTION';

// The separate card-token callback, fired when a customer ticks "save this card"
// in hosted checkout. Distinct from TRANSACTION so the two cannot collide on the
// `(gateway, providerEventId)` unique index.
export const PAYMOB_CARD_TOKEN_EVENT = 'CARD_TOKEN';

// The maximum PAN fragment permitted anywhere in storage or logs.
export const CARD_LAST4_LENGTH = 4;

// Cap on the stored event type string, so a hostile payload cannot write an
// unbounded value into the audit row.
export const WEBHOOK_EVENT_TYPE_MAX_LENGTH = 128;
export const WEBHOOK_EVENT_ID_MAX_LENGTH = 128;

// Returned to every webhook caller, valid or not. A gateway that receives a
// 4xx retries; telling a forger their signature failed just tells them to try
// a different one. Acknowledge, record, and act only on what verified.
export const WEBHOOK_ACK_BODY = { received: true } as const;
