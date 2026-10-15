export const URL_PATTERN = /https?:\/\/[^\s)\]>"'<]+/giu;
export const HEADING_PATTERN = /^(#{1,6})\s+(.+?)\s*#*\s*$/u;
export const LIST_ITEM_PATTERN = /^\s*(?:[-*+]|\d+[.)])\s+/u;
export const FENCE_PATTERN = /^\s*(?:```|~~~)/u;
export const TRAILING_URL_PUNCTUATION = /[.,;:!?]+$/u;
export const TABLE_CELL_PATTERN = /^\s*:?-{3,}:?\s*$/u;
export const PARAGRAPH_BREAK_PATTERN = /\n\s*\n/u;
export const HEADING_MARK_PATTERN = /^\s*#{1,6}\s*/u;
export const HEADING_NUMBERING_PATTERN = /^\d+[.)]\s+/u;

/** Digits of other scripts folded to ASCII so a number is compared by value, not by script. */
export const DIGIT_BLOCKS: readonly number[] = [0x0660, 0x06f0, 0x0966, 0x0e50];
export const DIGITS_PER_BLOCK = 10;

export const RAW_HTML_PATTERN = /<\/?[a-z][^>]*>/iu;
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
