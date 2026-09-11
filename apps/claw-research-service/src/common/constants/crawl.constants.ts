/** Pages fetched per crawl, homepage included. Bounded — spec section 21. */
export const CRAWL_DEFAULT_MAX_PAGES = 20;

/** Total sitemap.xml fetches allowed per crawl (root + nested combined). */
export const CRAWL_MAX_SITEMAP_FETCHES = 5;

/** Sitemap entries below this count trigger the homepage-link fallback. */
export const CRAWL_MIN_SITEMAP_URLS_BEFORE_LINK_FALLBACK = 3;

/** Concurrent page fetches in flight at once. */
export const CRAWL_CONCURRENCY = 4;

export const CRAWL_ROBOTS_TXT_PATH = '/robots.txt';
export const CRAWL_DEFAULT_SITEMAP_PATH = '/sitemap.xml';

/**
 * The name this crawler checks itself against in `robots.txt` groups.
 * Matches the `User-Agent` header `HttpFetchAdapter` sends on every request,
 * so a site's own robots.txt is respected against the same identity it sees
 * on the wire.
 */
export const CRAWL_USER_AGENT = 'ClawAI-ResearchBot';
