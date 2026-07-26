/**
 * Hard timeout for a server-side chat-service call.
 *
 * Short on purpose: this runs while rendering an unauthenticated page, so a slow
 * upstream would hold a render open for every visitor at once. Five seconds is
 * generous for a single indexed read and short enough that a stalled backend
 * degrades to a 404 instead of exhausting the render pool.
 */
export const CHAT_SHARE_FETCH_TIMEOUT_MS = 5000;

/** Path of the unauthenticated public read endpoint. */
export const PUBLIC_CHAT_SHARE_API_PATH = '/api/v1/public/chat-shares';

/** Path of the internal sitemap feed. */
export const CHAT_SHARE_SITEMAP_FEED_PATH = '/api/v1/internal/chat-shares/sitemap-feed';
export const CHAT_SHARE_SITEMAP_COUNT_PATH = '/api/v1/internal/chat-shares/sitemap-count';
export const CHAT_SHARE_RSS_FEED_PATH = '/api/v1/internal/chat-shares/rss-feed';

/**
 * How many entries the sitemap pulls per page from the feed.
 *
 * The feed is paginated so a deployment with a hundred thousand indexed shares
 * never loads them all into the render process at once.
 */
export const CHAT_SHARE_SITEMAP_PAGE_SIZE = 500;

/**
 * Ceiling on sitemap entries fetched in one build.
 *
 * The sitemap protocol caps a single file at 50 000 URLs. Stopping below that
 * leaves room for the static registry pages in the same document, and bounds the
 * work a sitemap request can trigger.
 */
export const CHAT_SHARE_SITEMAP_MAX_ENTRIES = 45_000;
