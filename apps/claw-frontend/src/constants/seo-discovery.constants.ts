export const SITEMAP_URL_CHUNK_SIZE = 40_000;
export const DISCOVERY_CACHE_CONTROL =
  'public, max-age=0, s-maxage=900, stale-while-revalidate=3600';
export const RSS_CACHE_CONTROL = 'public, max-age=0, s-maxage=300, stale-while-revalidate=900';
export const DEGRADED_RSS_CACHE_CONTROL =
  'public, max-age=0, s-maxage=30, stale-while-revalidate=60';
export const DISCOVERY_RETRY_AFTER_SECONDS = 30;
/**
 * Ceiling on items in the global `/rss.xml`.
 *
 * That feed carries every locale at once: 13 locales of registry pages plus up
 * to 100 public chats each. The cap is set above that ceiling so nothing is
 * dropped today, and exists only so a deployment with far more public chats
 * degrades into a large-but-finite document instead of an unbounded one. The
 * per-locale feeds stay the place to read one language in full.
 */
export const RSS_GLOBAL_MAX_ITEMS = 2000;

export const XML_CONTENT_TYPE = 'application/xml; charset=utf-8';
export const PLAIN_TEXT_CONTENT_TYPE = 'text/plain; charset=utf-8';
export const XSL_CONTENT_TYPE = 'text/xsl; charset=utf-8';

/** Stylesheet that renders the discovery XML as a readable table in a browser. */
export const DISCOVERY_STYLESHEET_PATH = '/discovery.xsl';
export const RSS_CONTENT_TYPE = 'application/rss+xml; charset=utf-8';
export const XML_INVALID_CONTROL_PATTERN = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/gu;
