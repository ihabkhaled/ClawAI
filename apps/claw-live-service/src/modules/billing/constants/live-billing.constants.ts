/**
 * Live Intelligence billing (architecture doc section 6). Prices and free
 * seconds are NOT here: they live in the versioned LivePolicyVersion (rule 37
 * item 13). These are mechanics only.
 */

/** Seconds in one settlement block. */
export const LIVE_BLOCK_SECONDS = 60;

/** Prefix of every block's idempotency key: `live:<sessionId>:<blockIndex>`. */
export const LIVE_BLOCK_KEY_PREFIX = 'live';

/**
 * The provider/model pair a Live block is recorded under at auth-service. They
 * are LEDGER LABELS only: LIVE_INTELLIGENCE is a fixed-price surface, so auth
 * does no rate lookup and no connector-policy check. The price is the policy's
 * per-minute price, sent as `fixedCostMicroUsd` on reserve and finalize with
 * every token and unit count 0 (auth `FIXED_PRICE_SURFACES`, ADR-221).
 */
export const LIVE_PAYG_PROVIDER = 'CLAW_LIVE';
export const LIVE_PAYG_MODEL = 'live-intelligence';

/** Smallest output ceiling auth accepts; a Live block has no tokens. */
export const LIVE_PAYG_OUTPUT_TOKENS = 1;

/**
 * Consecutive meter failures (unreachable / unparseable / unpriced) on one
 * session before its AI stops (EXHAUSTED). Bounds free service during a meter
 * outage to this many blocks; seconds are never charged blind.
 */
export const LIVE_METER_FAILURE_LIMIT = 3;

/** Redis counter of consecutive meter failures per session. */
export const LIVE_METER_FAILURE_KEY_PREFIX = 'live:meterfail:';
export const LIVE_METER_FAILURE_TTL_SECONDS = 3600;

/** How long a replica trusts a user's resolved plan slug. */
export const LIVE_PLAN_CACHE_MS = 60_000;

/** Upper bound on cached plan slugs per replica. */
export const LIVE_PLAN_CACHE_MAX_ENTRIES = 5000;

/** Reason carried on a CREDITS_REQUIRED status when the session's spending cap is reached. */
export const LIVE_SPENDING_CAP_REASON = 'SPENDING_CAP';

/** Prisma unique-constraint violation code (idempotency key already used). */
export const PRISMA_UNIQUE_VIOLATION = 'P2002';

/** Nest injection token for the EntitlementsAdapter used to resolve the plan slug. */
export const LIVE_ENTITLEMENTS_ADAPTER = Symbol('LIVE_ENTITLEMENTS_ADAPTER');
