/**
 * A model's context window is a property of the model, not of the request, so
 * it is cached for far longer than an exposure decision. It changes only when
 * an operator re-syncs or re-enriches the catalog.
 */
export const MODEL_CONTEXT_WINDOW_CACHE_TTL_MS = 900_000;

export const MODEL_CONTEXT_WINDOW_PATH_PREFIX = '/api/v1/internal/router-models/context-window';

/**
 * Short on purpose. This lookup sits on the send path, and an unknown window
 * costs a conservative budget — a slow one would cost the whole turn's latency.
 */
export const MODEL_CONTEXT_WINDOW_TIMEOUT_MS = 2_000;

/** Bounds the in-process cache so a large catalog cannot grow it without limit. */
export const MODEL_CONTEXT_WINDOW_CACHE_MAX_ENTRIES = 512;
