/**
 * Thin-content detection: a page whose extracted text is a JavaScript shell
 * or a link-preview stub must not count as read; the chain escalates to a
 * rendering tier instead (`isThinContent`, ADR-121).
 */

/** Visible text that says the page is a JS wall. Lower-case. */
export const JS_WALL_MARKERS: readonly string[] = [
  'enable javascript',
  'javascript is not available',
  'javascript is disabled',
  'javascript is required',
  'requires javascript',
  'turn on javascript',
  'need javascript',
  'without javascript',
  'javascript must be enabled',
];

/** A JS-wall marker only counts on a page with less text than this, in chars. */
export const JS_WALL_MAX_TEXT_CHARS = 2_000;

/**
 * "Tiny text plus a big script payload": below this much text, on a page
 * whose markup is at least `LOW_TEXT_MIN_HTML_CHARS` and script-driven.
 */
export const LOW_TEXT_MAX_CHARS = 1_000;
export const LOW_TEXT_MIN_HTML_CHARS = 150_000;

/** Visible text that says the content needs an account. Lower-case. */
export const LOGIN_WALL_MARKERS: readonly string[] = [
  'sign in to continue',
  'log in to continue',
  'login to continue',
  'sign in to view',
  'log in to view',
  'please sign in',
  'please log in',
  'you must be logged in',
  'you need to sign in',
  'you need to log in',
];

/** Prefix of the notice put in front of a page that stayed thin after rendering. */
export const THIN_PAGE_NOTICE_PREFIX = '[Page content not readable]';

export const THIN_PAGE_LOGIN_NOTICE =
  'This page asks the visitor to sign in, so its content is not public. Only the short text below was readable. Do not claim to have read the page; tell the user it requires login and ask them to paste the content.';

export const THIN_PAGE_SHELL_NOTICE =
  'Only a short page shell was readable here, even after the rendering tiers were tried. The page may need sign-in, or its content may load in a way the reader could not run. Do not claim to have read more than the text below.';
