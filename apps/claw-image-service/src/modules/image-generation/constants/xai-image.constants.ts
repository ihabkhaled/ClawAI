/**
 * xAI's public API root, used when the Grok connector row has no `baseUrl`.
 *
 * The connector admin form leaves the base URL empty for xAI (the live row has
 * `base_url = NULL`), so image-service must know the default itself; there is no
 * value to read from the connector.
 */
export const XAI_DEFAULT_BASE_URL = 'https://api.x.ai/v1';

/** A Grok Imagine image takes 5–20 s; the ceiling matches the other cloud adapters. */
export const XAI_IMAGE_TIMEOUT_MS = 120_000;

/**
 * xAI returns JPEG and says so in `data[].mime_type`; this is the fallback for a
 * response that omits the field.
 */
export const XAI_DEFAULT_IMAGE_MIME_TYPE = 'image/jpeg';
