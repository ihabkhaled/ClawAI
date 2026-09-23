// Gemini models that support image generation via generateContent + IMAGE modality
export const IMAGE_CAPABLE_MODELS = [
  'gemini-2.5-flash-image',
  'gemini-3.1-flash-image-preview',
  'gemini-3-pro-image-preview',
] as const;

/**
 * Prefix Google's ListModels puts on every id (`models/gemini-3-pro-image`).
 *
 * The connector catalog stores ids WITH it, the image adapter builds
 * `/models/<id>:generateContent` itself, so a catalog id passed straight
 * through would request `/models/models/…` and 404.
 */
export const GEMINI_MODEL_RESOURCE_PREFIX = 'models/';

/**
 * Header Google documents for API-key auth.
 *
 * The key used to travel as `?key=` in the URL, and the shared HTTP client logs
 * every request URL — so the Gemini API key was written to the image-service
 * log in plain text on every generation. A header is never logged.
 */
export const GEMINI_API_KEY_HEADER = 'x-goog-api-key';

/** A Gemini image takes 5–30 s; the ceiling covers a slow pro-image call. */
export const GEMINI_IMAGE_TIMEOUT_MS = 120_000;

/** Suffix the connector's OpenAI-compatible base URL carries and the native API does not. */
export const GEMINI_OPENAI_COMPAT_SUFFIX = '/openai';

export const GEMINI_DEFAULT_IMAGE_MIME_TYPE = 'image/png';
