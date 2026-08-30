export const EMBEDDING_HTTP_TIMEOUT_MS = 15_000;
export const EMBEDDING_CONTENT_MAX_CHARS = 8_000;
export const EMBEDDING_SNIPPET_MAX_CHARS = 2_000;
export const EMBEDDING_DEFAULT_TOP_K = 50;

/**
 * Consecutive failures before the embedding circuit opens.
 *
 * Three, not one: a single timeout is a blip, and opening on it would disable
 * semantic search for a transient network hiccup. Three in a row is a backend
 * that is down.
 */
export const EMBEDDING_CIRCUIT_FAILURE_THRESHOLD = 3;

/**
 * How long the circuit stays open before one call is allowed through again.
 *
 * Thirty seconds trades a little staleness for a lot of latency: while open,
 * every retrieval skips a call that costs ~4s and cannot succeed. An operator
 * installing the embedding model sees semantic search return within half a
 * minute without restarting anything.
 */
export const EMBEDDING_CIRCUIT_OPEN_MS = 30_000;
