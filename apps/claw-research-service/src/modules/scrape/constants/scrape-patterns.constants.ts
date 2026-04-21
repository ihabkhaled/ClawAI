/**
 * HTML regex patterns used by the extractors. We avoid depending on a
 * full DOM parser in Session 1; a cheerio/JSDOM upgrade is tracked for
 * Session 2 behind a ScrapeAdapter interface.
 */
export const SCRAPE_SCRIPT_STYLE_RE = /<(script|style|noscript)\b[^>]*>[\s\S]*?<\/\1>/gi;
export const SCRAPE_NAV_FOOTER_RE = /<(nav|footer|aside|header)\b[^>]*>[\s\S]*?<\/\1>/gi;
export const SCRAPE_HEADING_RE = /<(h[1-6])\b[^>]*>([\s\S]*?)<\/\1>/gi;
export const SCRAPE_PARAGRAPH_RE = /<p\b[^>]*>([\s\S]*?)<\/p>/gi;
export const SCRAPE_TABLE_RE = /<table\b[^>]*>[\s\S]*?<\/table>/gi;
export const SCRAPE_TABLE_ROW_RE = /<tr\b[^>]*>[\s\S]*?<\/tr>/gi;
export const SCRAPE_TABLE_CELL_RE = /<(th|td)\b[^>]*>([\s\S]*?)<\/\1>/gi;
export const SCRAPE_TAG_RE = /<[^>]+>/g;
export const SCRAPE_WS_RE = /\s+/g;

export const SCRAPE_ARTICLE_MAX_PARAGRAPHS = 200;
export const SCRAPE_DOCS_MAX_HEADINGS = 100;
export const SCRAPE_TABLE_MAX_TABLES = 20;
export const SCRAPE_TABLE_MAX_ROWS = 200;
export const SCRAPE_TEXT_MAX_CHARS = 50_000;
