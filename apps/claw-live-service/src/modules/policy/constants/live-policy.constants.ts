/** The literal held by the one active LivePolicyVersion row (emulated partial unique). */
export const LIVE_POLICY_ACTIVE_KEY = 'active';

/** How long a replica trusts its cached copy of the active policy. */
export const LIVE_POLICY_CACHE_MS = 10_000;

/** A model chain is walked in order: the first model, then its fallbacks (1..5 in all). */
export const LIVE_MODEL_CHAIN_MIN = 1;
export const LIVE_MODEL_CHAIN_MAX = 5;

/** Extra "council" agents (owner decision 2026-11-26): each drafts, the main model merges. */
export const LIVE_COUNCIL_MIN = 1;
export const LIVE_COUNCIL_MAX = 3;

/** The one council agent a version saved before 2026-11-26 gets (mirrors the seeder). */
export const LIVE_COUNCIL_DEFAULT_AGENT = {
  connector: 'GEMINI',
  model: 'gemini-3.1-flash-lite',
  style: 'OPENAI_COMPAT',
} as const;
