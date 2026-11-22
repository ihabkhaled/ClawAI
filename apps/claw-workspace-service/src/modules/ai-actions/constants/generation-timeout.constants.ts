/**
 * Bounds for the abort timer around every model-generation call this module
 * makes (cloud via chat-service, local via ollama-service).
 *
 * The timeout can arrive from a request body (`timeoutMs` on
 * /multi-model-review), so it is clamped before it reaches setTimeout
 * (CodeQL js/resource-exhaustion). The floor is 1 ms on purpose: the chain
 * drafter passes "whatever is left of its deadline", which can legitimately
 * be tiny. The ceiling sits above the DTO max (5 min) and the config default
 * (AI_ACTION_REQUEST_TIMEOUT_MS = 300 000).
 */
export const GENERATION_TIMEOUT_MIN_MS = 1;
export const GENERATION_TIMEOUT_MAX_MS = 10 * 60 * 1000; // 10 min
