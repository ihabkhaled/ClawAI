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
 * Provider credit cannot be detected from here, so a provider whose canary failed is listed by
 * hand until it is healthy again. An entry without `model` covers the whole provider. This is a
 * constants list because threads-service has no settings table; moving it to an admin-edited DB
 * row is a follow-up. Each entry states the REAL cause, measured on prod 2026-10-14 from the
 * provider's own error body (chat-service log `generateOnceStream: <PROVIDER> returned status=`):
 * - OPENAI: account has no credit.
 * - ANTHROPIC: removed 2026-10-14 after the owner raised the spend cap. The old cap error was a
 *   400 invalid_request_error ("You have reached your specified API usage limits"), so a future
 *   cap shows up the same way: look for that text before suspecting the request body.
 * - HUGGINGFACE: 402 "You have no remaining credits". Buy credits, then remove the entry.
 * - GROQ: the on_demand tier allows 7,000-8,000 tokens PER REQUEST (413 "Request too large ...
 *   Limit 8000, Requested 17934") while a Threads role prompt is 10-18k tokens, so no Groq model
 *   can succeed. Move the key to Dev Tier (or raise the limit), then remove the entry.
 */
export const THREAD_MODEL_DENY_LIST: ReadonlyArray<{ provider: string; model?: string }> = [
  { provider: 'OPENAI' },
  { provider: 'HUGGINGFACE' },
  { provider: 'GROQ' },
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

/**
 * Recent-health demotion (the step log of the last hour, the same counts the healing ranking
 * uses): a model whose own calls, or failing that its whole provider's, succeeded less often than
 * this share, over at least this many calls, is marked DEGRADED. It stays selectable (a warning,
 * not a ban) but is never preselected and ranks after every healthy model.
 */
export const RECOMMENDED_HEALTH_MIN_SAMPLES = 5;
export const RECOMMENDED_HEALTH_MIN_SUCCESS_RATE = 0.4;

/** A model with no recent calls ranks as if it succeeded this often: ahead of a failing one. */
export const RECOMMENDED_HEALTH_UNKNOWN_RATE = 0.75;

/** The health read is reused for this long; a failed read means "no health data", never an error. */
export const MODEL_HEALTH_CACHE_TTL_MS = 60_000;

/**
 * Model ids that are not chat models even when a catalog row says CHAT (for example the
 * `grok-imagine-*` image and video models). Matched on whole name parts, so `gemini-flash-image`
 * and `text-embedding-3` match but `imagination-chat` does not.
 */
export const THREAD_NON_CHAT_MODEL_PATTERN =
  /(?:^|[-_/:. ])(?:imagine|imagen|image|images|dall-?e|sora|veo|video|embeddings?|embed|tts|stt|whisper|moderation|rerank|transcribe|speech|audio-?gen)(?:$|[-_/:. 0-9])/iu;
