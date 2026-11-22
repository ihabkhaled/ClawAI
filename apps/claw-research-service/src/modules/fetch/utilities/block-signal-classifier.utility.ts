import { BlockSignalKind } from '../../../common/enums/block-signal-kind.enum';
import {
  BLOCK_SIGNAL_SCAN_CHARS,
  CAPTCHA_MARKERS,
  DEAD_HOST_ERROR_MARKERS,
  JS_CHALLENGE_MARKERS,
} from '../constants/fetch-strategy.constants';
import { isThinContent } from './thin-content.utility';
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
  result: Pick<FetchResult, 'httpStatus' | 'content' | 'mimeType' | 'rawHtml' | 'metadata'>,
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
  if (isThinContent(result)) {
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

function containsAnyMarker(haystack: string, markers: readonly string[]): boolean {
  return markers.some((marker) => haystack.includes(marker));
}
