export const HTML_BLOCKED_SCHEMES = ['javascript:', 'vbscript:', 'data:', 'mailto:', 'blob:'];

export const HTML_SCRIPT_STYLE_RE = /<(script|style|noscript|iframe|svg)\b[^>]*>[\s\S]*?<\/\1>/gi;
export const HTML_TAG_RE = /<\/?[^>]+>/g;
export const HTML_WHITESPACE_RE = /\s+/g;
export const HTML_TITLE_RE = /<title[^>]*>([\s\S]*?)<\/title>/i;
export const HTML_LINK_RE = /<a\b[^>]*href\s*=\s*["']([^"']+)["'][^>]*>/gi;
export const HTML_ENTITY_RE = /&(lt|gt|amp|quot|#39|nbsp);/g;

export const HTML_ENTITY_MAP: Record<string, string> = {
  lt: '<',
  gt: '>',
  amp: '&',
  quot: '"',
  '#39': "'",
  nbsp: ' ',
};
