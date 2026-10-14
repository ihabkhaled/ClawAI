/** The recommended team is per caller and plan-aware, so it is cached per owner for this long. */
export const RECOMMENDED_TEAM_CACHE_TTL_MS = 60_000;

/** Upper bound on cached owners; expired entries are dropped first, then the oldest. */
export const RECOMMENDED_TEAM_CACHE_MAX_ENTRIES = 500;

/**
 * Window assumed for a catalog model that publishes none. Mirrors
 * `THREADS_ASSUMED_WINDOW_TOKENS` in thread-generation-service, which applies the same number
 * when it checks a role's prompt (ADR-173), so a model offered here is one that service accepts.
 */
export const THREAD_ASSUMED_WINDOW_TOKENS = 32_768;

/** A model whose known window is smaller than this cannot hold a role's complete context. */
export const THREAD_MIN_TEAM_WINDOW_TOKENS = 32_768;

/**
 * Models and providers kept out of the recommended team and marked unavailable in the picker.
 * Provider credit cannot be detected from here, so a provider whose canary failed (OpenAI: no
 * credit, Anthropic: hidden 400, backlog P0-3) is listed by hand until it is healthy again. An
 * entry without `model` covers the whole provider. This is a constants list because
 * threads-service has no settings table; moving it to an admin-edited DB row is a follow-up.
 */
export const THREAD_MODEL_DENY_LIST: ReadonlyArray<{ provider: string; model?: string }> = [
  { provider: 'OPENAI' },
  { provider: 'ANTHROPIC' },
];

/** Providers tried first, in order, when choosing the team; others follow alphabetically. */
export const RECOMMENDED_PROVIDER_ORDER: readonly string[] = ['GEMINI', 'GROK', 'OLLAMA'];

/** Cheaper bands rank first; an unknown band ranks last. */
export const USAGE_TIER_RANK: ReadonlyMap<string, number> = new Map([
  ['LOW', 0],
  ['MEDIUM', 1],
  ['HIGH', 2],
  ['EXTRA_HIGH', 3],
]);

export const RECOMMENDED_AUTHOR_COUNT = 3;

/** Backups per seat, each on a provider other than the seat's own. */
export const RECOMMENDED_FALLBACKS_PER_SEAT = 2;
