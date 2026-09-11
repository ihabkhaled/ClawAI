export const SITEMAP_INDEX_ROOT_RE = /<sitemapindex\b/i;
export const SITEMAP_URLSET_ROOT_RE = /<urlset\b/i;

export const SITEMAP_SITEMAP_ENTRY_RE = /<sitemap\b[^>]*>([\s\S]*?)<\/sitemap>/gi;
export const SITEMAP_URL_ENTRY_RE = /<url\b[^>]*>([\s\S]*?)<\/url>/gi;

export const SITEMAP_LOC_RE = /<loc\b[^>]*>([\s\S]*?)<\/loc>/i;
export const SITEMAP_LASTMOD_RE = /<lastmod\b[^>]*>([\s\S]*?)<\/lastmod>/i;
export const SITEMAP_CHANGEFREQ_RE = /<changefreq\b[^>]*>([\s\S]*?)<\/changefreq>/i;
export const SITEMAP_PRIORITY_RE = /<priority\b[^>]*>([\s\S]*?)<\/priority>/i;

/**
 * `xhtml:link` is the namespaced form the sitemaps.org hreflang extension
 * documents; some generators emit a bare `link` instead when they declare
 * the xhtml namespace as default. Both are self-closing (`.../>` or
 * `...></xhtml:link>` are both seen in the wild), so this matches the OPEN
 * tag only and reads its attributes, not tag content.
 */
export const SITEMAP_ALTERNATE_LINK_RE =
  /<(?:xhtml:)?link\b[^>]*rel\s*=\s*["']alternate["'][^>]*\/?>/gi;

export const SITEMAP_CDATA_RE = /^<!\[CDATA\[([\s\S]*?)\]\]>$/i;
