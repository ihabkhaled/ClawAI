import {
  BLOCK_SIGNAL_EMPTY_SHELL_MIN_CHARS,
  SCRIPT_DRIVEN_MARKUP_PATTERN,
} from '../constants/fetch-strategy.constants';
import {
  JS_WALL_MARKERS,
  JS_WALL_MAX_TEXT_CHARS,
  LOGIN_WALL_MARKERS,
  LOW_TEXT_MAX_CHARS,
  LOW_TEXT_MIN_HTML_CHARS,
  THIN_PAGE_LOGIN_NOTICE,
  THIN_PAGE_NOTICE_PREFIX,
  THIN_PAGE_SHELL_NOTICE,
} from '../constants/thin-content.constants';
import type { FetchResult } from '../types/fetch.types';

/**
 * True when a 2xx/3xx HTML result's extracted text is a shell, not the page:
 *
 * 1. under 200 chars on script-driven markup (`<script>`, `<noscript>`, an SPA mount);
 * 2. under 200 chars on a social-card stub — og:/twitter: tags and no body
 *    text of its own (the link-preview variant chatgpt.com serves to a bot);
 * 3. a JS-wall sentence ("enable JavaScript") on a page under 2 000 chars;
 * 4. under 1 000 chars on 150 KB+ of script-driven markup.
 *
 * Thin text alone is not a shell: example.com is 130 chars of honest static
 * HTML with no scripts and no social card. A false positive costs only an
 * escalation — the chain still returns the live thin text if every renderer
 * agrees (`markThinResult`). The text checked is the FINAL extraction, so a
 * page whose embedded state or site adapter produced real text is not thin.
 */
export function isThinContent(
  result: Pick<FetchResult, 'httpStatus' | 'content' | 'mimeType' | 'rawHtml' | 'metadata'>,
): boolean {
  // 3xx included: a rendering sidecar reports the first response's status
  // (a 302 to a sign-in or landing page) while handing back the final page.
  if (result.httpStatus < 200 || result.httpStatus >= 400 || result.mimeType !== 'text/html') {
    return false;
  }
  const html = result.rawHtml;
  if (html === undefined) {
    return false;
  }
  const length = result.content.trim().length;
  const scriptDriven = SCRIPT_DRIVEN_MARKUP_PATTERN.test(html);
  if (length < BLOCK_SIGNAL_EMPTY_SHELL_MIN_CHARS && (scriptDriven || hasSocialCard(result))) {
    return true;
  }
  if (length < JS_WALL_MAX_TEXT_CHARS && containsAny(result.content, JS_WALL_MARKERS)) {
    return true;
  }
  return length < LOW_TEXT_MAX_CHARS && scriptDriven && html.length >= LOW_TEXT_MIN_HTML_CHARS;
}

/** True when the text asks the visitor to sign in. */
export function isLoginWall(content: string): boolean {
  return containsAny(content, LOGIN_WALL_MARKERS);
}

/**
 * A page that stayed thin on every tier is returned (its live text beats an
 * error), but labelled so neither the model nor the narration can present it
 * as read: a notice in front of the text, and `thinContent: true`.
 */
export function markThinResult(result: FetchResult): FetchResult {
  const notice = isLoginWall(result.content) ? THIN_PAGE_LOGIN_NOTICE : THIN_PAGE_SHELL_NOTICE;
  return {
    ...result,
    content: `${THIN_PAGE_NOTICE_PREFIX} ${notice}\n\n${result.content}`,
    thinContent: true,
  };
}

function hasSocialCard(result: Pick<FetchResult, 'metadata'>): boolean {
  const metadata = result.metadata;
  return (
    metadata !== undefined &&
    (Object.keys(metadata.openGraph).length > 0 || Object.keys(metadata.twitterCard).length > 0)
  );
}

function containsAny(text: string, markers: readonly string[]): boolean {
  const lower = text.toLowerCase();
  return markers.some((marker) => lower.includes(marker));
}
