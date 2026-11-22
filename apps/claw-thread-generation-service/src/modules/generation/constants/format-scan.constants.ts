export const URL_PATTERN = /https?:\/\/[^\s)\]>"'<]+/giu;
/** ATX heading marks run from `#` to `######`; `parseHeadingLine` reads a heading line. */
export const HEADING_MAX_LEVEL = 6;
export const LIST_ITEM_PATTERN = /^\s*(?:[-*+]|\d+[.)])\s+/u;
export const FENCE_PATTERN = /^\s*(?:```|~~~)/u;
/** Stripped from a url's end by a loop (CodeQL js/polynomial-redos flagged `/[.,;:!?]+$/u`). */
export const TRAILING_URL_PUNCTUATION_CHARACTERS = '.,;:!?';
/** One whitespace character, as `\s` reads it. */
export const WHITESPACE_CHARACTER = /^\s$/u;
/** One character the regex `.` does not match (a line terminator). */
export const LINE_TERMINATOR_CHARACTER = /^[\n\r\u2028\u2029]$/u;
export const TABLE_CELL_PATTERN = /^\s*:?-{3,}:?\s*$/u;
export const PARAGRAPH_BREAK_PATTERN = /\n\s*\n/u;
export const HEADING_MARK_PATTERN = /^\s*#{1,6}\s*/u;
export const HEADING_NUMBERING_PATTERN = /^\d+[.)]\s+/u;

/** Digits of other scripts folded to ASCII so a number is compared by value, not by script. */
export const DIGIT_BLOCKS: readonly number[] = [0x0660, 0x06f0, 0x0966, 0x0e50];
export const DIGITS_PER_BLOCK = 10;

/**
 * The first letter of a tag name after `<` or `</`; `containsRawHtml` scans for `<name ... >`. The
 * one regex it replaces, `<\/?[a-z][^>]*>`, was flagged by CodeQL js/polynomial-redos: a text of
 * many `<a` with no `>` was re-scanned to its end from every `<`.
 */
export const HTML_TAG_NAME_START = /^[a-z]$/iu;
/** A 16-hex evidence id in brackets that is not a link label; ids are matched with a minimum length. */
export const UNKNOWN_MARKER_PATTERN = /\[([0-9a-f]{8,})\](?!\()/giu;
export const NUMBER_PATTERN = /\d[\d.,]*/gu;
export const TRAILING_NUMBER_PUNCTUATION = /[.,]+$/u;
export const MARKUP_CHARACTERS_PATTERN = /[|>*_`~[\]()#]|:?-{3,}:?/gu;
export const PERCENT = 100;

/** The article is considered already typeset when it passes these thresholds. */
export const FORMATTED_MIN_SECTIONS = 2;
export const FORMATTED_MAX_PARAGRAPH_WORDS = 110;
export const FORMATTED_SHORT_ARTICLE_WORDS = 160;
