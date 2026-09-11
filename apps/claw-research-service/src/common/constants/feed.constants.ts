export const FEED_RSS_ROOT_RE = /<rss\b/i;
export const FEED_ATOM_ROOT_RE =
  /<feed\b[^>]*xmlns\s*=\s*["']http:\/\/www\.w3\.org\/2005\/Atom["']/i;

export const FEED_RSS_ITEM_RE = /<item\b[^>]*>([\s\S]*?)<\/item>/gi;
export const FEED_ATOM_ENTRY_RE = /<entry\b[^>]*>([\s\S]*?)<\/entry>/gi;

export const FEED_TITLE_RE = /<title\b[^>]*>([\s\S]*?)<\/title>/i;
/** RSS: `<link>text</link>`. */
export const FEED_RSS_LINK_RE = /<link\b[^>]*>([\s\S]*?)<\/link>/i;
/** Atom: `<link href="..."/>`, optionally with a `rel` that isn't "alternate". */
export const FEED_ATOM_LINK_TAG_RE = /<link\b[^>]*\/?>(?:<\/link>)?/gi;
export const FEED_PUBDATE_RE = /<pubDate\b[^>]*>([\s\S]*?)<\/pubDate>/i;
export const FEED_UPDATED_RE = /<updated\b[^>]*>([\s\S]*?)<\/updated>/i;
export const FEED_PUBLISHED_RE = /<published\b[^>]*>([\s\S]*?)<\/published>/i;

export const FEED_CDATA_RE = /^<!\[CDATA\[([\s\S]*?)\]\]>$/i;
