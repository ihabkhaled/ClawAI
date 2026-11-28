/** Bounds on what an answer stores per cited source (hover preview only). */
export const CITATION_MAX_TITLE_CHARS = 300;
export const CITATION_MAX_SNIPPET_CHARS = 280;
/**
 * A hard cap on metadata size that covers the largest evidence list a turn can hold (a 200-page site crawl). It was 50,
 * less than research rounds gather: measured 2026-11-28, an answer's [53] [54] [56] could not be linked.
 */
export const CITATION_MAX_COUNT = 200;

/**
 * Citation marks some models (gpt-oss) write instead of `[n]`: `【3】`, `【3†L1-L4】`, `【1, 3】`. Measured 2026-11-28: a
 * researched answer carried 42 stored sources and only 【n】 marks, so nothing was clickable. Digits only, so CJK
 * headings such as 【重要】 are never touched.
 */
export const LENTICULAR_CITATION_PATTERN = /【([^】\n]{1,60})】/gu;
/** What follows `†` in a mark is the model's own line reference and is dropped. */
export const LENTICULAR_CITATION_REFERENCE_MARK = '†';
export const LENTICULAR_CITATION_SEPARATOR = /[,，、]/u;
export const LENTICULAR_CITATION_NUMBER_PATTERN = /^\d{1,3}$/u;
export const LENTICULAR_CITATION_MAX_NUMBERS = 10;
/** A bracketed list, `[2, 4, 23]`, which the UI cannot link either; never one right after a word (`matrix[1, 2]`). */
export const BRACKET_CITATION_LIST_PATTERN = /(?<![\p{L}\p{N}_])\[([\d ,，、]{3,40})\]/gu;
/** Fenced and inline code, which citation rewriting never touches: `[1, 2]` there is code. */
export const CITATION_CODE_SEGMENT_PATTERN = /(```[\s\S]*?(?:```|$)|`[^`\n]*`)/gu;
