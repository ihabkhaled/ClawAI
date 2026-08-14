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
 * Gemini's thinking budget, as its OpenAI-compatible surface expects it.
 *
 * A STRING, not a number. Sending `0` returns
 * `400 Invalid value at 'reasoning_effort' (TYPE_STRING)` and fails every call
 * — which mocked tests cannot catch, because a mock never validates the body.
 * Confirmed against the live API: 'low' and 'minimal' are both accepted.
 *
 * Routing wants the cheapest fast answer rather than deliberation, so the
 * lowest accepted setting is used.
 */
export const GEMINI_MINIMAL_THINKING_EFFORT = 'minimal';

/** Value Ollama accepts to force a JSON-only answer. */
export const OLLAMA_JSON_FORMAT = 'json';

/** Fallback when a provider returns an error body with no usable message. */
export const UNKNOWN_PROVIDER_MESSAGE = 'provider returned an unreadable error';

/** Longest provider error message kept on an attempt record. */
export const SAFE_MESSAGE_MAX_LENGTH = 200;

/**
 * Provider base URLs when a connector row stores none.
 *
 * `baseUrl` is optional on the connector DTO and nullable in its schema, and
 * connector-service defaults it only INSIDE its own private adapters — the
 * `/internal/connectors/config` payload returns `connector.baseUrl ?? undefined`
 * verbatim. A perfectly valid connector (API key, no base URL) therefore reaches
 * routing-service with nothing to call, and the adapters were reporting that as
 * AUTHENTICATION_FAILED: a provider-scoped, quarantining code that killed the
 * whole chain on a correct configuration.
 *
 * Mirrors connector-service's own defaults so both services agree on where a
 * provider lives.
 */
export const PROVIDER_DEFAULT_BASE_URLS: Readonly<Record<string, string>> = Object.freeze({
  GEMINI: 'https://generativelanguage.googleapis.com/v1beta/openai',
  OLLAMA_CLOUD: 'https://ollama.com/api',
});

/** Hosts that mean "the local runtime", never the hosted cloud endpoint. */
export const OLLAMA_LOCALHOST_PATTERNS: readonly string[] = ['localhost', '127.0.0.1', '0.0.0.0'];

export const OLLAMA_CLOUD_API_BASE_URL = 'https://ollama.com/api';
export const OLLAMA_CLOUD_HOSTNAME = 'ollama.com';
