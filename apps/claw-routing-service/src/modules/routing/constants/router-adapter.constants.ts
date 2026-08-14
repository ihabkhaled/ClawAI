/** Path on connector-service that resolves a provider's credentials. */
export const CONNECTOR_CONFIG_PATH = '/api/v1/internal/connectors/config';

/** Credentials are fetched over intra-cluster HTTP; a short cache keeps a
 * six-entry chain from making six identical lookups per request without
 * holding a key long enough to outlive a rotation. */
export const CREDENTIAL_CACHE_TTL_MS = 30_000;

export const CONNECTOR_CONFIG_TIMEOUT_MS = 5_000;

/** OpenAI-compatible chat completions, which Gemini's compat layer exposes. */
export const OPENAI_COMPATIBLE_CHAT_PATH = '/chat/completions';

/** Ollama's native chat endpoint. */
export const OLLAMA_CHAT_PATH = '/chat';

/** ollama-service's local generate proxy, used only by the legacy adapter. */
export const OLLAMA_LOCAL_GENERATE_PATH = '/api/v1/ollama/generate';

/**
 * Routing is a classification task with a tiny structured answer, so a low
 * ceiling both bounds cost and stops a chatty model burying the JSON in prose.
 */
export const ROUTER_MAX_OUTPUT_TOKENS = 320;

/** Deterministic routing: the same request should not rank differently twice. */
export const ROUTER_TEMPERATURE = 0;

/**
 * Gemini 3.x exposes a thinking budget. Routing wants the cheapest, fastest
 * answer rather than deliberation, and the pack seeds the primary entry as a
 * minimal-thinking model precisely for that.
 */
export const GEMINI_MINIMAL_THINKING_BUDGET = 0;

/** Value Ollama accepts to force a JSON-only answer. */
export const OLLAMA_JSON_FORMAT = 'json';

/** Fallback when a provider returns an error body with no usable message. */
export const UNKNOWN_PROVIDER_MESSAGE = 'provider returned an unreadable error';

/** Longest provider error message kept on an attempt record. */
export const SAFE_MESSAGE_MAX_LENGTH = 200;
