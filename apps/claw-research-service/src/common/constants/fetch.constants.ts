/** Maximum HTTP response body size we will parse (2 MB). */
export const FETCH_MAX_BYTES = 2 * 1024 * 1024;
/** Maximum characters retained after extraction (roughly 32 KB of text). */
export const FETCH_MAX_CONTENT_LENGTH = 32_000;
/** Default per-request timeout in milliseconds. */
export const FETCH_DEFAULT_TIMEOUT_MS = 10_000;
/** Cache TTL in milliseconds (15 minutes). */
export const FETCH_CACHE_TTL_MS = 15 * 60 * 1000;
/** Max redirects we will follow. */
export const FETCH_MAX_REDIRECTS = 5;

/** Mime types we are willing to parse. */
export const FETCH_ALLOWED_MIME_TYPES: ReadonlySet<string> = new Set([
  'text/html',
  'application/xhtml+xml',
  'text/plain',
  'application/json',
  'text/markdown',
  'application/pdf',
]);
