export const UNTITLED_PUBLICATION_TITLE = 'Untitled draft';
export const MAX_PUBLICATION_TITLE_LENGTH = 120;
export const MAX_PUBLICATION_SLUG_LENGTH = 60;

/** ATX heading marks run from `#` to `######`. */
export const MAX_HEADING_LEVEL = 6;
/** One blank between the heading marks and the heading text. */
export const HEADING_BLANK = /^[ \t]$/u;
/** One character of a heading's closing run (blanks and closing `#`s). */
export const HEADING_CLOSING = /^[ \t#]$/u;
/** The line terminators at which the `m` regex flag ends a line. */
export const MULTILINE_LINE_BREAK = /[\n\r\u2028\u2029]/u;

/**
 * Words that are literal path segments under `/thread-publications/public/`. A Thread whose slug
 * equalled one of them would be shadowed by that route (`public/board`, `public/discover`,
 * `public/sitemap`) and unreachable, so slug generation never issues them. The unique suffix
 * already makes a bare match impossible; this list is the guard that survives a change to it.
 */
export const RESERVED_PUBLICATION_SLUGS: ReadonlySet<string> = new Set([
  'board',
  'discover',
  'sitemap',
]);
