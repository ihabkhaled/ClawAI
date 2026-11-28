/**
 * Untrusted fences (research engine B1, 2026-11-27). Anything the platform did not write — a plugin tool result, a web
 * page, a search snippet — reaches a model only inside a fence the content cannot close, after hostile characters are
 * removed. One sanitiser serves every fence (`utilities/untrusted-fence.utility.ts`).
 */

/**
 * Code point ranges stripped from anything untrusted: C0 and C1 controls (tab, newline and carriage return stay),
 * zero-width and joiner characters, bidi embeddings, overrides and isolates, and the byte-order mark.
 */
export const UNTRUSTED_HOSTILE_CODE_POINT_RANGES: ReadonlyArray<readonly [number, number]> = [
  [0x00, 0x08],
  [0x0b, 0x0c],
  [0x0e, 0x1f],
  [0x7f, 0x9f],
  [0x200b, 0x200f],
  [0x202a, 0x202e],
  [0x2060, 0x206f],
  [0xfeff, 0xfeff],
];

/** The fence every web source is shown in: `<web_source n="1" url="…" trust="untrusted">`. */
export const WEB_SOURCE_TAG = 'web_source';
export const UNTRUSTED_TRUST_VALUE = 'untrusted';

/**
 * A closing `web_source` tag in any spelling a model may read as one: ASCII, HTML entities, full-width and small
 * forms of `<` `/` `>`, any case, `-` or nothing for the underscore, attributes or spaces before `>`. Hostile code
 * points are stripped BEFORE this runs, so a zero-width character inside the name cannot hide it.
 */
export const WEB_SOURCE_CLOSING_TAG =
  /(?:<|&lt;?|&#0*60;?|&#x0*3c;?|＜|﹤)\s*(?:\/|&#0*47;?|&#x0*2f;?|&sol;|／)\s*web[_-]?source(?![\w-])[^<>\n]{0,64}?(?:>|&gt;?|&#0*62;?|&#x0*3e;?|＞|﹥)/giu;
/** The same closing tag cut off before its `>`: still defanged, so nothing that follows can complete it. */
export const WEB_SOURCE_CLOSING_TAG_BARE =
  /(?:<|&lt;?|&#0*60;?|&#x0*3c;?|＜|﹤)\s*(?:\/|&#0*47;?|&#x0*2f;?|&sol;|／)\s*web[_-]?source(?![\w-])/giu;
/** An opening tag inside a page, which could otherwise forge a second "source" with a trusted-looking label. */
export const WEB_SOURCE_OPENING_TAG =
  /(?:<|&lt;?|&#0*60;?|&#x0*3c;?|＜|﹤)\s*web[_-]?source(?![\w-])[^<>\n]{0,256}?(?:>|&gt;?|&#0*62;?|&#x0*3e;?|＞|﹥)/giu;
export const WEB_SOURCE_OPENING_TAG_BARE =
  /(?:<|&lt;?|&#0*60;?|&#x0*3c;?|＜|﹤)\s*web[_-]?source(?![\w-])/giu;
export const WEB_SOURCE_CLOSING_TAG_DEFANGED = '[/web_source]';
export const WEB_SOURCE_OPENING_TAG_DEFANGED = '[web_source]';

/** Characters a URL attribute may not carry raw (they could end the attribute or the tag); each is percent-encoded. */
export const WEB_SOURCE_URL_UNSAFE = /["'<>`\\\s]/gu;
export const WEB_SOURCE_URL_MAX_CHARS = 2_048;
export const WEB_SOURCE_TITLE_MAX_CHARS = 300;
export const WEB_SOURCE_NO_TITLE = '(no title)';
export const WEB_SOURCE_TITLE_LABEL = 'Title: ';
/** Line breaks inside a title: a title stays on its one line. */
export const WEB_SOURCE_TITLE_LINE_BREAKS = /[\r\n]+/gu;

/** Room a fence needs around its body (tags, attributes, title line), so a capped list never cuts a fence open. */
export const WEB_SOURCE_FENCE_MIN_BODY_CHARS = 200;
export const WEB_SOURCE_TRUNCATION_MARKER = '\n[truncated]';
/** Appended when a list of sources had to stop early to fit; `{count}` is how many were left out. */
export const WEB_SOURCES_LEFT_OUT_NOTE = '({count} further web sources were left out to fit.)';

/** A planner-facing evidence summary (after a crawl, in a gap check) keeps each page short: titles and openings. */
export const WEB_SOURCE_SUMMARY_MIN_BODY_CHARS = 80;
/** Fence, URL and title room assumed per page when a summary splits its budget between pages. */
export const WEB_SOURCE_SUMMARY_FENCE_OVERHEAD_CHARS = 150;

/** Links a `web_fetch` tool result lists inside its fence; the rest of the page's links are dropped. */
export const WEB_TOOL_RESULT_MAX_LINKS = 50;
/** First line of a web tool result (platform-written, outside every fence). `{details}` may be empty. */
export const WEB_SEARCH_TOOL_RESULT_HEADER = 'web_search results{details}.';
export const WEB_SEARCH_TOOL_NO_RESULTS = 'web_search returned no results.';
export const WEB_FETCH_TOOL_RESULT_HEADER = 'web_fetch result{details}.';
export const WEB_CRAWLED_PAGE_TOOL_RESULT_HEADER = 'get_crawled_page result.';
/** A hosted web tool answer in a shape this code does not know: still fenced, whole, as one source. */
export const WEB_TOOL_RESULT_HEADER = 'Web tool result.';
/** A platform-written detail on a tool result's header line (provider names, a capture date). */
export const WEB_TOOL_HEADER_DETAIL_MAX_CHARS = 120;
