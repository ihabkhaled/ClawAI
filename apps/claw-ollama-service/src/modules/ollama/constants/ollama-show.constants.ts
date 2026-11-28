// ADR-234 — the context window of an installed model, asked of Ollama itself.
//
// `POST /api/show` answers with `model_info`, whose `<arch>.context_length` is the
// window the model was trained for. It is one HTTP call per model, so every number
// here exists to keep the routing snapshot (which asks for all installed models)
// fast and bounded. Mirrors connector-service's constants of the same name; the two
// services never import each other.

/** `model_info` keys that carry a window end with this (`qwen3.context_length`). */
export const OLLAMA_CONTEXT_LENGTH_KEY_SUFFIX = '.context_length';

/** The key naming the architecture whose `<arch>.context_length` is the model's own window. */
export const OLLAMA_ARCHITECTURE_KEY = 'general.architecture';

/** At most this many `/api/show` calls in flight at once. */
export const OLLAMA_SHOW_CONCURRENCY = 4;

/** One lookup that takes longer than this is abandoned: the window stays unknown. */
export const OLLAMA_SHOW_TIMEOUT_MS = 5_000;

/** Network lookups per snapshot. Installed models are few; this is a ceiling, not a target. */
export const OLLAMA_SHOW_MAX_LOOKUPS_PER_SYNC = 100;

/** No new lookup starts once a snapshot has spent this long on them. */
export const OLLAMA_SHOW_SYNC_BUDGET_MS = 30_000;

/** An answered window is reused for a day: a model's trained window does not change. */
export const OLLAMA_SHOW_CACHE_TTL_MS = 24 * 60 * 60 * 1000;

/** A lookup that failed or carried no window is asked again after an hour. */
export const OLLAMA_SHOW_FAILURE_RETRY_MS = 60 * 60 * 1000;
