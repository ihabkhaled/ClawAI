/**
 * The canonical memory retrieval API, as chat-service calls it.
 *
 * memory-service owns which memories are relevant and why; chat-service asks
 * and reports. The legacy `GET /internal/memories/for-context` returned the
 * most recent N with no intent and no ranking, which put the actual selection
 * in chat-service — and out of step with the context preview, which already
 * used this route. See ADR-086 finding F-05.
 */
export const MEMORY_RETRIEVE_PATH = '/api/v1/internal/memories/retrieve';

/**
 * Retrieval's OWN budget, not the prompt's.
 *
 * It bounds how much memory memory-service may return. The composer then
 * budgets the whole prompt against the model's real context window, and may
 * still drop some of what comes back. Passing the prompt budget here would ask
 * memory-service to fill the window with memories.
 */
export const MEMORY_RETRIEVE_TOKEN_BUDGET = 4096;

/** Short: memory is an enhancement, and a slow one costs the whole turn. */
export const MEMORY_RETRIEVE_TIMEOUT_MS = 5_000;
