import { MICRO_USD_PER_USD } from './billing.constants';

// ═══════════════════════════════════════════════════════════════════════════
// PAYG connector credit
//
// READ THIS BEFORE ADDING A NUMBER HERE.
//
// A per-plan dollar allowance is NOT a constant. It lives on
// `Plan.monthlyProviderCostCeilingMicroUsd` and is seeded, because it is a
// pricing decision an operator changes without a deploy. What belongs in this
// file is only the mechanism: keys, bounds, and shapes that are the same for
// every plan and every customer.
//
// The one number this file must never contain is a price.
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Providers whose inference costs ClawAI real money and therefore debits a
 * user's PAYG credit.
 *
 * This is the DEFAULT applied by the connector migration, not the runtime
 * authority: `Connector.isPayAsYouGo` is admin-editable, and the reservation
 * path reads the connector policy rather than this list. Compiling the decision
 * into six copies of a shared package would make the admin toggle unenforceable
 * without a six-container rebuild (ADR-082).
 */
export const PAYG_DEFAULT_PROVIDERS: readonly string[] = Object.freeze([
  'OPENAI',
  'ANTHROPIC',
  'GEMINI',
  'DEEPSEEK',
  'GROK',
  'AWS_BEDROCK',
]);

/**
 * Providers that run on hardware the operator or the user already owns, so a
 * request costs no marginal money.
 *
 * A PAYG provider must NEVER resolve through this set's zero-rate fallback in
 * `ModelCostService.unpricedSnapshot`: that path returns `isPriced: true` at a
 * rate of 0, which would silently make a metered provider free. Asserted in
 * code and tested.
 */
export const PAYG_EXEMPT_PROVIDERS: readonly string[] = Object.freeze(['OLLAMA', 'LLAMACPP']);

/**
 * Smallest answer worth spending someone's last cents on.
 *
 * When the affordability clamp cannot buy at least this many output tokens the
 * request is refused instead of served, because handing back two truncated
 * sentences and an empty wallet is a worse outcome than a clear "add credit".
 */
export const PAYG_MIN_VIABLE_OUTPUT_TOKENS = 256;

/**
 * How long a hold survives without being finalized or released.
 *
 * This is how long a crashed request holds a customer's money. It has to exceed
 * the longest legitimate generation (a long agent turn) and stay far below a
 * billing period, or a killed container silently shrinks the user's balance for
 * the rest of the month. chat-service runs 4 replicas in production and a
 * rolling recreate kills in-flight streams, so this path is exercised on every
 * deploy — it is not a theoretical edge.
 */
export const PAYG_RESERVATION_TTL_MS = 15 * 60 * 1000;

/** How often the sweeper reclaims expired holds. Single-flight under a Redis lock. */
export const PAYG_RESERVATION_SWEEP_INTERVAL_MS = 5 * 60 * 1000;

/**
 * Warning thresholds, as a percentage of the period grant AND an absolute floor.
 *
 * The absolute floor is the part that matters and is easy to leave out. A pure
 * percentage is the wrong shape: on a small plan, "95% consumed" can already be
 * less than one request's hold, so the warning would fire AFTER the user was
 * blocked. Whichever condition trips first wins.
 */
export const PAYG_WARNING_THRESHOLDS = Object.freeze([
  Object.freeze({ percentConsumed: 80, minRemainingMicroUsd: 500_000 }),
  Object.freeze({ percentConsumed: 95, minRemainingMicroUsd: 150_000 }),
]);

/** How long auth caches a provider rate before re-reading it from routing-service. */
export const PAYG_RATE_CACHE_TTL_SECONDS = 300;

/** How long auth caches a provider's PAYG policy from connector-service. */
export const PAYG_POLICY_CACHE_TTL_SECONDS = 60;

/** Redis key namespaces. Separate prefixes so a targeted flush cannot clear the wrong one. */
export const PAYG_RATE_CACHE_PREFIX = 'claw:payg:rate:';
export const PAYG_POLICY_CACHE_PREFIX = 'claw:payg:policy:';
export const PAYG_WALLET_CACHE_PREFIX = 'claw:payg:wallet:';
export const PAYG_SWEEP_LOCK_KEY = 'claw:job:credit:reservation-sweep';
export const PAYG_GRANT_RENEWAL_LOCK_KEY = 'claw:job:credit:grant-renewal';

/**
 * The platform-wide kill switch, stored in `SystemSetting`.
 *
 * DB-level rather than an environment variable so it can be flipped without a
 * container recreate during an incident. Defaults to disabled until the
 * allowance seeders have been verified BY READING THE TABLE — both docker
 * entrypoints swallow a seed failure, so a green log is not evidence.
 */
export const PAYG_ENABLED_SETTING_KEY = 'payg.credit.enabled';

/** Bounds on an operator credit adjustment. Prevents a fat-finger from minting a fortune. */
export const PAYG_MAX_ADMIN_ADJUSTMENT_MICRO_USD = 1_000 * MICRO_USD_PER_USD;
export const PAYG_ADJUSTMENT_REASON_MIN_LENGTH = 8;
export const PAYG_ADJUSTMENT_REASON_MAX_LENGTH = 500;

/**
 * Micro-USD in one minor currency unit. One cent is 10,000 micro-USD.
 *
 * The bridge between the two money units this platform uses: prices are integer
 * MINOR units (cents), provider cost and credit are integer MICRO-USD. Every
 * conversion between a payment and a credit balance goes through this.
 */
export const MICRO_USD_PER_MINOR_UNIT = 10_000;

/**
 * What a top-up buys, in basis points of the amount paid.
 *
 * 10000 = 100%: pay $10, get $10 of connector credit. A top-up is a pass-through
 * purchase of provider spend at face value, and the platform's margin on it is
 * zero by decision — the margin lives in the PLAN, where only
 * `Plan.paygCreditPercentBps` of the subscription price converts to credit.
 *
 * The consequence is real and accepted: gateway fees on a top-up come out of
 * the platform's pocket. Recorded in `docs/business/topup-pricing.md`.
 *
 * This is the DEFAULT the seeder applies. The authority is
 * `CreditPackageVersion.creditMicroUsd`, an immutable column, so changing the
 * rate mints a new version and never rewrites what somebody already bought.
 */
export const CREDIT_TOPUP_RATIO_BPS = 10_000;

/** Top-up package slugs. The amounts and credit ratios live in CreditPackageVersion rows. */
export const CREDIT_PACKAGE_SLUGS: readonly string[] = Object.freeze([
  'credit-5',
  'credit-10',
  'credit-25',
  'credit-50',
  'credit-100',
]);

/** Route bases. `/api/v1/billing` already proxies to payment-service, so auth's wallet cannot live under it. */
export const CREDIT_API_BASE = '/credit';
export const CREDIT_INTERNAL_API_BASE = '/internal/credit';
export const ADMIN_CREDIT_API_BASE = '/admin/credit';

/** Ledger page size for the account UI. Bounded so a heavy user cannot pull a year in one request. */
export const CREDIT_LEDGER_PAGE_SIZE = 25;
export const CREDIT_LEDGER_MAX_PAGE_SIZE = 100;
