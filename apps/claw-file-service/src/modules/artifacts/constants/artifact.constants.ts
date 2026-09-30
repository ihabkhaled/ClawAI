/**
 * The largest artifact accepted, in UTF-8 bytes. Matches the coding agent's
 * `MAX_ARTIFACT_BYTES` so a file the extension prepared is never refused here
 * for size, and a client that skips its own check still cannot store more.
 */
export const MAX_ARTIFACT_BYTES = 1_048_576;

/** Types the extension can label an artifact with. Anything else is refused. */
export const ARTIFACT_MIME_TYPES = [
  'text/plain',
  'text/markdown',
  'text/html',
  'text/csv',
  'application/json',
  'image/svg+xml',
] as const;

export const MAX_ARTIFACT_FILENAME_LENGTH = 255;
export const MAX_ARTIFACT_TITLE_LENGTH = 200;

/** 24 random bytes = 192 bits, 32 base64url characters. Unguessable. */
export const ARTIFACT_PUBLIC_ID_BYTES = 24;
export const ARTIFACT_PUBLIC_ID_PATTERN = /^[A-Za-z0-9_-]{32}$/u;

/** Public path the viewer reads, appended to PUBLIC_SITE_URL. */
export const PUBLIC_ARTIFACT_PATH = '/api/v1/public/artifacts';

/** Header the coding agent sends while zero data retention is on. Lower-case: Node's form. */
export const ZERO_RETENTION_HEADER = 'x-claw-zero-retention';

/** Per-user publish rate, on top of the global throttler. */
export const ARTIFACT_PUBLISH_THROTTLE = { limit: 20, ttl: 60_000 } as const;

/**
 * Headers on the public read. The content is untrusted user text: it is
 * served as text/plain only, never sniffed, never framed, never scripted, and
 * never cached (a deleted artifact must stop resolving at once).
 */
export const PUBLIC_ARTIFACT_CONTENT_TYPE = 'text/plain; charset=utf-8';
export const PUBLIC_ARTIFACT_CSP = "default-src 'none'; sandbox; frame-ancestors 'none'";
export const PUBLIC_ARTIFACT_CACHE_CONTROL = 'no-store';
export const PUBLIC_ARTIFACT_ROBOTS = 'noindex, nofollow, noarchive';
