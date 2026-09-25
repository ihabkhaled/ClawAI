/**
 * Readability's minimum article length, in characters. Lower than its
 * default (500) so a short but real news brief still counts as an article.
 */
export const READABILITY_CHAR_THRESHOLD = 250;

/** The `](target` part of a Markdown link; group 1 is the target. */
export const MARKDOWN_LINK_TARGET_PATTERN = /\]\(([^)\s]+)/gu;

/** A link target that is already absolute (`scheme:`) or an in-page `#fragment`. */
export const ABSOLUTE_OR_FRAGMENT_PATTERN = /^(?:[a-z][a-z\d+.-]*:|#)/iu;

/** Pages larger than this are not handed to Readability (parse cost grows with size). */
export const READABILITY_MAX_INPUT_BYTES = 4 * 1024 * 1024;

/**
 * A Readability result replaces the plain extracted text only when its own
 * text is at least this share of the plain text's length — below that it
 * probably picked one sidebar block instead of the page.
 */
export const READABILITY_MIN_SHARE_OF_PLAIN_TEXT = 0.25;
