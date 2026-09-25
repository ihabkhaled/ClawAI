import { BlockSignalKind } from '../../../common/enums/block-signal-kind.enum';
import {
  BLOCK_SIGNAL_EMPTY_SHELL_MIN_CHARS,
  BLOCK_SIGNAL_SCAN_CHARS,
  CAPTCHA_MARKERS,
  DEAD_HOST_ERROR_MARKERS,
  JS_CHALLENGE_MARKERS,
  SCRIPT_DRIVEN_MARKUP_PATTERN,
} from '../constants/fetch-strategy.constants';
import type { FetchResult } from '../types/fetch.types';

/**
 * Reads a completed `FetchResult` and says whether it looks blocked, and by
 * what class of block. Pure function, no I/O.
 *
 * Order matters: a captcha outranks a JS challenge (a challenge page that
 * embeds a captcha is a captcha); the status-code refusals (401/451) outrank
 * any marker, because the server has said something explicit; and any marker
 * outranks the empty-shell heuristic, since a challenge page is short on
 * purpose, not for lack of rendering.
 */
export function classifyBlockSignal(
  result: Pick<FetchResult, 'httpStatus' | 'content' | 'mimeType' | 'rawHtml'>,
): BlockSignalKind {
  const status = result.httpStatus;
  const lowerContent = result.content.slice(0, BLOCK_SIGNAL_SCAN_CHARS).toLowerCase();

  const statusSignal = classifyStatus(status);
  if (statusSignal !== null) {
    return statusSignal;
  }
  if (containsAnyMarker(lowerContent, CAPTCHA_MARKERS)) {
    return BlockSignalKind.CAPTCHA;
  }
  if (status === 503 || containsAnyMarker(lowerContent, JS_CHALLENGE_MARKERS)) {
    return BlockSignalKind.JS_CHALLENGE;
  }
  if (isThinHtml(result)) {
    return BlockSignalKind.EMPTY_JS_SHELL;
  }
  return status >= 400 ? BlockSignalKind.UNKNOWN_ERROR : BlockSignalKind.NONE;
}

/**
 * Classifies a thrown error. A host that does not resolve or refuses the
 * connection is treated as a dead page (only the archive can help); anything
 * else is an unknown error the chain may escalate past.
 */
export function classifyBlockSignalFromError(error: unknown): BlockSignalKind {
  const message = error instanceof Error ? error.message.toLowerCase() : '';
  const cause =
    error instanceof Error && error.cause instanceof Error ? error.cause.message.toLowerCase() : '';
  const haystack = `${message} ${cause}`;
  return containsAnyMarker(haystack, DEAD_HOST_ERROR_MARKERS)
    ? BlockSignalKind.NOT_FOUND
    : BlockSignalKind.UNKNOWN_ERROR;
}

function classifyStatus(status: number): BlockSignalKind | null {
  switch (status) {
    case 401:
    case 407: {
      return BlockSignalKind.AUTH_REQUIRED;
    }
    case 451: {
      return BlockSignalKind.LEGAL_UNAVAILABLE;
    }
    case 404:
    case 410: {
      return BlockSignalKind.NOT_FOUND;
    }
    case 429: {
      return BlockSignalKind.RATE_LIMITED;
    }
    case 403: {
      return BlockSignalKind.FORBIDDEN;
    }
    default: {
      return null;
    }
  }
}

/**
 * Thin text alone is not a shell — example.com is 130 characters of honest
 * static HTML. A shell is thin text on a page whose markup is script-driven
 * (a `<script>` tag or an SPA mount point), i.e. the text is plausibly still
 * to come. Without raw HTML to look at, a thin page is taken at its word.
 */
function isThinHtml(
  result: Pick<FetchResult, 'httpStatus' | 'content' | 'mimeType' | 'rawHtml'>,
): boolean {
  const isThin =
    result.httpStatus >= 200 &&
    result.httpStatus < 300 &&
    result.mimeType === 'text/html' &&
    result.content.trim().length < BLOCK_SIGNAL_EMPTY_SHELL_MIN_CHARS;
  return (
    isThin && result.rawHtml !== undefined && SCRIPT_DRIVEN_MARKUP_PATTERN.test(result.rawHtml)
  );
}

function containsAnyMarker(haystack: string, markers: readonly string[]): boolean {
  return markers.some((marker) => haystack.includes(marker));
}
