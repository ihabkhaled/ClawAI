/** Pages fetched per crawl, homepage included. Bounded — spec section 21. */
export const CRAWL_DEFAULT_MAX_PAGES = 20;

/** Total sitemap.xml fetches allowed per crawl (root + nested combined). */
export const CRAWL_MAX_SITEMAP_FETCHES = 20;

/** Sitemap entries below this count trigger the homepage-link fallback. */
export const CRAWL_MIN_SITEMAP_URLS_BEFORE_LINK_FALLBACK = 3;

/** Concurrent page fetches in flight at once. */
export const CRAWL_CONCURRENCY = 8;

export const CRAWL_ROBOTS_TXT_PATH = '/robots.txt';
export const CRAWL_DEFAULT_SITEMAP_PATH = '/sitemap.xml';

/**
 * The name this crawler checks itself against in `robots.txt` groups.
 * Matches the `User-Agent` header `HttpFetchAdapter` sends on every request,
 * so a site's own robots.txt is respected against the same identity it sees
 * on the wire.
 */
export const CRAWL_USER_AGENT = 'ClawAI-ResearchBot';

/**
 * Hard ceiling on a caller-chosen crawl size.
 *
 * The planner may ask for more pages than the default when a question is about
 * a whole site, but every page is an outbound fetch billed as WEB_FETCH and a
 * request against someone else's server, and the whole crawl runs inside one
 * chat turn. Forty keeps a large docs site useful without turning one message
 * into a scrape.
 */
export const CRAWL_MAX_PAGES_CEILING = 200;

/**
 * How many link hops past the homepage a crawl may follow when the sitemap
 * alone cannot fill the page budget. It used to be one hop only (sitemap, or
 * homepage links when the sitemap was thin), so a site without a large sitemap
 * could never yield more than its homepage's own links - asking for 200 pages
 * got 12. Each hop stays on the same site and passes robots.txt and the fetch
 * guard like every other page.
 */
export const CRAWL_MAX_LINK_DEPTH = 3;

/** Words shorter than this carry no signal when ranking pages against a question. */
export const CRAWL_RANK_MIN_TERM_LENGTH = 4;
