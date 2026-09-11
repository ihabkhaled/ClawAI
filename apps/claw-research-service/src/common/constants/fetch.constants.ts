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
  // sitemap.xml and RSS/Atom feeds are served under either of these,
  // depending on the server.
  'application/xml',
  'text/xml',
  // The feed-specific content-types some servers use instead of the
  // generic XML ones above.
  'application/rss+xml',
  'application/atom+xml',
]);

/**
 * MIME types whose full, untruncated body is kept on `FetchResult.rawHtml`
 * (the truncated `content` field is capped at `FETCH_MAX_CONTENT_LENGTH`,
 * which a real sitemap.xml or feed can exceed well before its closing tag).
 * HTML needs this for the scrape module's structured extractors; XML needs
 * it so a sitemap/feed parser sees the whole document, not a cut one.
 */
export const RAW_BODY_PRESERVED_MIME_TYPES: ReadonlySet<string> = new Set([
  'text/html',
  'application/xhtml+xml',
  'application/xml',
  'text/xml',
  'application/rss+xml',
  'application/atom+xml',
]);
