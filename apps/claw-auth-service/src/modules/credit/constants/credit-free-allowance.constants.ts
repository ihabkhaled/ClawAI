import { PaygSurface } from '@claw/shared-types';

/**
 * Surfaces eligible for the plan's free credit-connector allowance (ADR-142).
 *
 * An explicit ALLOW-list of token-priced surfaces, never a deny-list: a surface
 * added to `PaygSurface` tomorrow is therefore NOT free until somebody decides it
 * should be. Per-unit surfaces (IMAGE, VIDEO, TRANSCRIPTION, TTS) are excluded on
 * purpose, because one clip can cost $1.60 and "2 requests" would then be an
 * unbounded giveaway. VISION_HELPER is excluded too: a helper call is not a
 * request the user made. THREADS IS eligible (2026-10-13, ADR-162 addendum): every plan may start a
 * Thread and Free gets one for life, but a Thread is many model calls, so its calls ride the
 * allowance WITHOUT being held to the request count (see
 * `FREE_ALLOWANCE_COUNT_WAIVED_SURFACES`); the money meter and the price limit still apply.
 * CODING_AGENT IS counted (2026-10-02): the agent loop is
 * reachable by a Free account and nothing else gates it, so leaving it out let a
 * capped plan run unlimited credit-connector turns. Each agent turn takes one slot.
 */
export const FREE_ALLOWANCE_ELIGIBLE_SURFACES: readonly PaygSurface[] = Object.freeze([
  PaygSurface.CHAT,
  PaygSurface.CODING_AGENT,
  PaygSurface.COMPARE,
  PaygSurface.JUDGE,
  PaygSurface.ORCHESTRATION,
  PaygSurface.FILE_GENERATION,
  PaygSurface.WORKSPACE_ACTION,
  PaygSurface.ROUTING,
  PaygSurface.THREADS,
]);

/**
 * Eligible surfaces whose calls are NOT stopped by the monthly request count, only by the money
 * meter and the price limit. A Thread makes a dozen calls for ONE user action (the plan's Threads
 * allowance is what counts that action), so holding each call to "10 requests a month" would
 * let a Free user start their one Thread and fail it at the eleventh call.
 *
 * Waived under EVERY plan shape (D-P5-01): a count-only Free plan must finish its one Thread too.
 * Without a meter the lifetime Thread allowance, the job's cap and the per-request ceiling bound it.
 */
export const FREE_ALLOWANCE_COUNT_WAIVED_SURFACES: readonly PaygSurface[] = Object.freeze([
  PaygSurface.THREADS,
]);

/**
 * Hard ceiling on what ONE free request may cost the platform when the plan has
 * no `monthlyProviderCostCeilingMicroUsd` to derive it from: $0.15.
 *
 * This is a liability cap, not a price: it never reaches a user and no invoice or
 * wallet figure is computed from it. When the plan HAS a ceiling the per-request
 * budget is the smaller of this and `ceiling / allowance`, so a provider's free
 * requests in a month can never add up to more than the plan's own ceiling.
 */
export const FREE_ALLOWANCE_FALLBACK_REQUEST_CEILING_MICRO_USD = 150_000n;

/**
 * Stand-in limit passed to the atomic counter when the plan's allowance is
 * unlimited (`null`). Postgres INT4 maximum: a user cannot reach it in a month.
 */
export const FREE_ALLOWANCE_UNLIMITED_COUNTER_LIMIT = 2_147_483_647;

/** Ledger `reason` for a request admitted on the allowance. */
export const FREE_ALLOWANCE_LEDGER_REASON_USED = 'FREE_ALLOWANCE_USED';

/**
 * Ledger `reason` for a count-waived request (a Thread call) admitted on the allowance: it took no
 * slot on the monthly count, so its release returns none (D-L2-04).
 */
export const FREE_ALLOWANCE_LEDGER_REASON_USED_UNCOUNTED = 'FREE_ALLOWANCE_USED:UNCOUNTED';

/** Ledger `reason` prefix when the allowance is given back; the release reason follows. */
export const FREE_ALLOWANCE_LEDGER_REASON_RETURNED = 'FREE_ALLOWANCE_RETURNED';

/**
 * Counter key of the ONE total a user spends across every credit connector in a
 * UTC month (owner decision 2026-10-02: "stop at N", not N per provider). It is
 * stored in the `provider` column of `credit_free_allowance_usage` so the table
 * and its unique index stay as they are. Never a real provider name.
 */
export const FREE_ALLOWANCE_TOTAL_COUNTER_KEY = '*';
