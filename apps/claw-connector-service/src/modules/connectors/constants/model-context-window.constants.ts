/**
 * Page size for Google's native `GET /v1beta/models`, the list that carries
 * `inputTokenLimit`. One page covers the whole Gemini catalog.
 */
export const GEMINI_NATIVE_MODELS_PAGE_SIZE = 1000;

/** The `property_id` under which Cloudflare's model search publishes a window. */
export const CLOUDFLARE_CONTEXT_WINDOW_PROPERTY_ID = 'context_window';
