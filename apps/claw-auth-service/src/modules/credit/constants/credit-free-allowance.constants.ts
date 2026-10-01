import { PaygSurface } from '@claw/shared-types';

/**
 * Surfaces eligible for the plan's free credit-connector allowance (ADR-142).
 *
 * An explicit ALLOW-list of token-priced surfaces, never a deny-list: a surface
 * added to `PaygSurface` tomorrow is therefore NOT free until somebody decides it
 * should be. Per-unit surfaces (IMAGE, VIDEO, TRANSCRIPTION, TTS) are excluded on
 * purpose, because one clip can cost $1.60 and "2 requests" would then be an
 * unbounded giveaway. VISION_HELPER and CODING_AGENT are excluded too: a helper
 * call is not a request the user made, and the agent loop spends a hold per turn.
 */
export const FREE_ALLOWANCE_ELIGIBLE_SURFACES: readonly PaygSurface[] = Object.freeze([
  PaygSurface.CHAT,
  PaygSurface.COMPARE,
  PaygSurface.JUDGE,
  PaygSurface.ORCHESTRATION,
  PaygSurface.FILE_GENERATION,
  PaygSurface.WORKSPACE_ACTION,
  PaygSurface.ROUTING,
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

/** Ledger `reason` prefix when the allowance is given back; the release reason follows. */
export const FREE_ALLOWANCE_LEDGER_REASON_RETURNED = 'FREE_ALLOWANCE_RETURNED';
