/**
 * Consecutive failures before a dependency circuit opens.
 *
 * Three, not one: a single timeout is a blip, and opening on it would disable a
 * working feature for a transient hiccup. Three in a row is a dependency that
 * is down.
 */
export const DEPENDENCY_CIRCUIT_FAILURE_THRESHOLD = 3;

/**
 * How long a circuit stays open before one call is allowed through again.
 *
 * Thirty seconds trades a little staleness for a lot of latency: while open,
 * every request skips a call that costs seconds and cannot succeed. An operator
 * installing the missing model sees the feature return within half a minute
 * without restarting anything.
 */
export const DEPENDENCY_CIRCUIT_OPEN_MS = 30_000;

/** Circuit keys. One per independently-failable dependency. */
export const CIRCUIT_OLLAMA_EMBEDDINGS = 'ollama:embeddings';
export const CIRCUIT_OLLAMA_GENERATE = 'ollama:generate';
