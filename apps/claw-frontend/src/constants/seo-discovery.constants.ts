export const SITEMAP_URL_CHUNK_SIZE = 40_000;
export const DISCOVERY_CACHE_CONTROL =
  'public, max-age=0, s-maxage=900, stale-while-revalidate=3600';
export const RSS_CACHE_CONTROL = 'public, max-age=0, s-maxage=300, stale-while-revalidate=900';
export const DEGRADED_RSS_CACHE_CONTROL =
  'public, max-age=0, s-maxage=30, stale-while-revalidate=60';
export const DISCOVERY_RETRY_AFTER_SECONDS = 30;
export const XML_CONTENT_TYPE = 'application/xml; charset=utf-8';
export const RSS_CONTENT_TYPE = 'application/rss+xml; charset=utf-8';
export const XML_INVALID_CONTROL_PATTERN = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/gu;
