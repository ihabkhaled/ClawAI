// PayPal REST surface. Only paypal.adapter.ts may use these — every other file
// in the service talks to the adapter, so a PayPal API change has exactly one
// blast radius.

export const PAYPAL_SANDBOX_BASE_URL = 'https://api-m.sandbox.paypal.com';
export const PAYPAL_LIVE_BASE_URL = 'https://api-m.paypal.com';

export const PAYPAL_PATHS = {
  OAUTH_TOKEN: '/v1/oauth2/token',
  ORDERS: '/v2/checkout/orders',
  VERIFY_WEBHOOK: '/v1/notifications/verify-webhook-signature',
  PRODUCTS: '/v1/catalogs/products',
  BILLING_PLANS: '/v1/billing/plans',
  SUBSCRIPTIONS: '/v1/billing/subscriptions',
  PAYMENT_CAPTURES: '/v2/payments/captures',
} as const;

// Refresh the OAuth token this many seconds BEFORE PayPal expires it. Without a
// margin a token can expire in flight — between the check and the request
// arriving — turning a valid charge into a 401 the caller has to guess about.
export const PAYPAL_TOKEN_EXPIRY_MARGIN_SECONDS = 60;

// Only these two verdicts mean the money actually moved. Anything else
// (CREATED, SAVED, APPROVED, PAYER_ACTION_REQUIRED, VOIDED) is a state the user
// can reach WITHOUT paying, so treating them as success would grant a paid plan
// for free.
export const PAYPAL_TERMINAL_SUCCESS_STATUSES: ReadonlyArray<string> = ['COMPLETED', 'CAPTURED'];

export const PAYPAL_ACTIVE_SUBSCRIPTION_STATUSES: ReadonlyArray<string> = ['ACTIVE'];

// PayPal's own verdict string for a webhook whose signature checks out.
export const PAYPAL_WEBHOOK_VERIFICATION_SUCCESS = 'SUCCESS';

// Header names carrying the webhook signature material. All of them are
// required — verification with a missing header is not verification.
export const PAYPAL_WEBHOOK_HEADERS = {
  TRANSMISSION_ID: 'paypal-transmission-id',
  TRANSMISSION_TIME: 'paypal-transmission-time',
  TRANSMISSION_SIG: 'paypal-transmission-sig',
  CERT_URL: 'paypal-cert-url',
  AUTH_ALGO: 'paypal-auth-algo',
} as const;

// Webhook event names this service acts on. An unrecognised event is recorded
// and ignored rather than guessed at.
export const PAYPAL_EVENT_TYPES = {
  SUBSCRIPTION_ACTIVATED: 'BILLING.SUBSCRIPTION.ACTIVATED',
  SUBSCRIPTION_UPDATED: 'BILLING.SUBSCRIPTION.UPDATED',
  SUBSCRIPTION_CANCELLED: 'BILLING.SUBSCRIPTION.CANCELLED',
  SUBSCRIPTION_SUSPENDED: 'BILLING.SUBSCRIPTION.SUSPENDED',
  SUBSCRIPTION_EXPIRED: 'BILLING.SUBSCRIPTION.EXPIRED',
  SUBSCRIPTION_PAYMENT_FAILED: 'BILLING.SUBSCRIPTION.PAYMENT.FAILED',
  PAYMENT_CAPTURE_COMPLETED: 'PAYMENT.CAPTURE.COMPLETED',
  PAYMENT_CAPTURE_DENIED: 'PAYMENT.CAPTURE.DENIED',
  PAYMENT_CAPTURE_REFUNDED: 'PAYMENT.CAPTURE.REFUNDED',
  PAYMENT_CAPTURE_REVERSED: 'PAYMENT.CAPTURE.REVERSED',
  VAULT_TOKEN_CREATED: 'VAULT.PAYMENT-TOKEN.CREATED',
  VAULT_TOKEN_DELETED: 'VAULT.PAYMENT-TOKEN.DELETED',
} as const;

// Only these are safe to retry: they are idempotent reads, or writes carrying a
// PayPal-Request-Id that makes a repeat a no-op. A bare capture is NOT retried
// — a duplicate capture charges the customer twice.
export const PAYPAL_RETRYABLE_STATUS_CODES: ReadonlyArray<number> = [408, 429, 500, 502, 503, 504];

export const PAYPAL_MAX_RETRY_ATTEMPTS = 3;
export const PAYPAL_RETRY_BASE_DELAY_MS = 250;
