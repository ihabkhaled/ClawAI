// ---- Weighted-token normalization ----

// The economic unit the whole quota system is denominated in.
//
// Raw token counts are not comparable across providers: an output token on a
// frontier model can cost 300x an input token on a small one. So every request
// is converted to WEIGHTED tokens, defined by this baseline:
//
//   1_000_000 weighted tokens === $1.00 of estimated provider cost
//
// which makes the conversion exactly `weightedTokens = ceil(costMicroUsd)`,
// since 1 micro-USD === 1 weighted token. Integer arithmetic throughout.
export const MICRO_USD_PER_USD = 1_000_000;
export const WEIGHTED_TOKENS_PER_USD = 1_000_000;

// Per-million-token provider rates are quoted in micro-USD; dividing by this
// converts a rate to a per-token cost.
export const TOKENS_PER_PRICING_UNIT = 1_000_000;

// ---- Fixed-point scaling ----

// FX rates and proration ratios are stored as scaled integers so no float ever
// touches a billing calculation. A rate of 48.75 EGP/USD is 487_500_000 at
// FX_RATE_SCALE = 1e7.
export const FX_RATE_SCALE = 10_000_000;
export const PRORATION_RATIO_SCALE = 1_000_000;
export const BASIS_POINTS_DENOMINATOR = 10_000;

// Version of the plan-change arithmetic. Persisted on every quote so a charge
// stays reproducible after the calculator changes: without it, re-deriving an
// old amount would silently apply today's rules to yesterday's money.
//
//   1 - KEEP_CYCLE_PRORATE_DIFFERENCE only (pre-v2 behaviour)
//   2 - adds RESET_CYCLE_WITH_UNUSED_CREDIT, explicit line items, credit surplus
export const PRORATION_CALCULATOR_VERSION = 2;

// ---- Currency ----

// Plan prices are canonical in USD. Paymob may settle in EGP via an FxQuote.
export const BILLING_BASE_CURRENCY = 'USD';

// Currencies ClawAI can charge in, with their minor-unit exponent. A currency
// absent from this map is rejected rather than assumed to have 2 decimals.
export const SUPPORTED_BILLING_CURRENCIES: Readonly<Record<string, number>> = Object.freeze({
  USD: 2,
  EGP: 2,
  EUR: 2,
  GBP: 2,
});

// ---- Plan catalog slugs ----

// Immutable identifiers. `free`, `pro` and `team` predate billing and MUST keep
// their slugs so existing assignments survive the catalog migration.
export const PLAN_SLUG_FREE = 'free';
export const PLAN_SLUG_STARTER = 'starter';
export const PLAN_SLUG_PLUS = 'plus';
export const PLAN_SLUG_PRO = 'pro';
export const PLAN_SLUG_TEAM = 'team';
export const PLAN_SLUG_SCALE = 'scale';
export const PLAN_SLUG_UNLIMITED = 'unlimited';

export const PUBLIC_PLAN_SLUGS: readonly string[] = Object.freeze([
  PLAN_SLUG_FREE,
  PLAN_SLUG_STARTER,
  PLAN_SLUG_PLUS,
  PLAN_SLUG_PRO,
  PLAN_SLUG_TEAM,
  PLAN_SLUG_SCALE,
  PLAN_SLUG_UNLIMITED,
]);

// ---- RabbitMQ queues ----

export const BILLING_ENTITLEMENT_QUEUE = 'claw.billing.entitlement';
export const BILLING_AUDIT_QUEUE = 'claw.billing.audit';
export const BILLING_OUTBOX_DLQ = 'claw.billing.outbox.dlq';

// Every billing event routes on `billing.#`; consumers bind this one key rather
// than enumerating eleven patterns.
export const BILLING_EVENT_ROUTING_PREFIX = 'billing.#';

// Bumped only on a breaking payload change. Consumers reject unknown versions.
export const BILLING_EVENT_SCHEMA_VERSION = 1;

// ---- API routes ----

export const BILLING_API_BASE = 'billing';
export const PAYMENTS_API_BASE = 'payments';

// Internal, service-to-service surface. Separately authenticated from the public
// API and never exposed through the public gateway route.
export const PAYMENT_INTERNAL_API_BASE = 'internal/payments';
export const AUTH_INTERNAL_BILLING_API_BASE = 'internal/billing';

// ---- Operational bounds ----

export const CHECKOUT_SESSION_TTL_MS = 30 * 60 * 1000;
export const PRORATION_QUOTE_TTL_MS = 15 * 60 * 1000;
// Webhooks older than this are rejected even with a valid signature, to bound
// the replay window a captured request stays useful for.
export const WEBHOOK_REPLAY_TOLERANCE_MS = 10 * 60 * 1000;
export const DEFAULT_GRACE_PERIOD_MS = 3 * 24 * 60 * 60 * 1000;

// ---- Cooling-off ----

export const MS_PER_HOUR = 60 * 60 * 1000;

// A captured subscription payment is fully refundable through
// `capturedAt + this`, INCLUSIVE of the exact boundary instant. Plans may widen
// or narrow it through their policy revision; this is the default and the value
// the published refund policy states.
//
// The window is measured from provider-confirmed capture, never from checkout
// creation, invoice issue, or the arrival time of the refund request.
export const DEFAULT_COOLING_OFF_HOURS = 48;
