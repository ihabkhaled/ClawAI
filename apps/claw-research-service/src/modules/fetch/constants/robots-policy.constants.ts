/** The product token robots.txt groups are matched against. */
export const ROBOTS_USER_AGENT_TOKEN = 'ClawAI-ResearchBot';

/** RFC 9309 §2.5: parse at least 500 KiB; anything past this is ignored. */
export const ROBOTS_MAX_BYTES = 512 * 1024;

/** Timeout for downloading one robots.txt, in ms. */
export const ROBOTS_FETCH_TIMEOUT_MS = 8_000;

/** How long a fetched (or 4xx) robots.txt is trusted, in ms. RFC 9309 suggests ≤ 24 h. */
export const ROBOTS_CACHE_TTL_MS = 60 * 60 * 1_000;

/** How long an unreachable robots.txt is remembered before trying again, in ms. */
export const ROBOTS_UNREACHABLE_CACHE_TTL_MS = 10 * 60 * 1_000;

/** Most origins kept in the in-process robots cache. Oldest are evicted first. */
export const ROBOTS_CACHE_MAX_ENTRIES = 500;

/** Upper bound honoured for `Crawl-delay`, in ms — a site asking for an hour gets 10 s. */
export const ROBOTS_MAX_CRAWL_DELAY_MS = 10_000;

/** Statuses after which robots.txt is retried with the TLS-impersonating client. */
export const ROBOTS_RETRY_IMPERSONATED_STATUSES: ReadonlySet<number> = new Set([401, 403, 503]);
