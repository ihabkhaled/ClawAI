export const HTML_BLOCKED_SCHEMES = ['javascript:', 'vbscript:', 'data:', 'mailto:', 'blob:'];

export const HTML_SCRIPT_STYLE_RE = /<(script|style|noscript|iframe|svg)\b[^>]*>[\s\S]*?<\/\1>/gi;
export const HTML_TAG_RE = /<\/?[^>]+>/g;
export const HTML_WHITESPACE_RE = /\s+/g;
export const HTML_TITLE_RE = /<title[^>]*>([\s\S]*?)<\/title>/i;
export const HTML_LINK_RE = /<a\b[^>]*href\s*=\s*["']([^"']+)["'][^>]*>/gi;
export const HTML_ENTITY_RE = /&(lt|gt|amp|quot|#39|nbsp);/g;

// ─── Head metadata ──────────────────────────────────────────────────────────
//
// Attribute order inside a tag is not fixed (`<meta content="x" name="y">` is
// as valid as the reverse), so each tag is matched whole first and its
// attributes are pulled out of that substring individually — never assumed to
// appear in a specific order.

export const HTML_META_TAG_RE = /<meta\b[^>]*>/gi;
export const HTML_LINK_TAG_RE = /<link\b[^>]*>/gi;
export const HTML_JSON_LD_RE =
  /<script\b[^>]*type\s*=\s*["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;

/**
 * Fixed, non-dynamic patterns for pulling one attribute out of an already-
 * matched tag substring. Kept as literals (never `new RegExp(name)`) so this
 * cannot become a non-literal-regexp finding.
 */
export const HTML_ATTR_RE = {
  name: /\bname\s*=\s*["']([^"']*)["']/i,
  property: /\bproperty\s*=\s*["']([^"']*)["']/i,
  content: /\bcontent\s*=\s*["']([^"']*)["']/i,
  href: /\bhref\s*=\s*["']([^"']*)["']/i,
  rel: /\brel\s*=\s*["']([^"']*)["']/i,
  hreflang: /\bhreflang\s*=\s*["']([^"']*)["']/i,
} as const;

/** `og:` and `twitter:` properties/names are lowercase by spec convention. */
export const OG_PREFIX = 'og:';
export const TWITTER_PREFIX = 'twitter:';

export const HTML_ENTITY_MAP: ReadonlyMap<string, string> = new Map<string, string>([
  ['lt', '<'],
  ['gt', '>'],
  ['amp', '&'],
  ['quot', '"'],
  ['#39', "'"],
  ['nbsp', ' '],
]);
