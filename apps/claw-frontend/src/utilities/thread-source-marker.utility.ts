import {
  THREAD_DIGIT_ZERO_BLOCKS,
  THREAD_SOURCE_MARKER_CLOSERS,
  THREAD_SOURCE_MARKER_ID,
  THREAD_SOURCE_MARKER_OPENERS,
  THREAD_SOURCE_MARKER_RUN_CHARACTER,
  THREAD_SOURCE_MARKER_SEPARATOR,
  THREAD_SOURCE_MARKER_URL_MAX_CHARS,
  THREAD_SOURCE_MARKER_URL_START,
} from '@/constants/thread-source-marker.constants';

function foldDigits(text: string): string {
  return text.replaceAll(/\p{Nd}/gu, (digit) => {
    const code = digit.codePointAt(0) ?? 0;
    const zero = THREAD_DIGIT_ZERO_BLOCKS.find((block) => code >= block && code <= block + 9);
    return zero === undefined ? digit : String(code - zero);
  });
}

function normaliseToken(token: string): string {
  return foldDigits(token.normalize('NFKC'))
    .replaceAll(/\p{Cf}/gu, '')
    .toLowerCase();
}

/** A bracket run made only of 16-hex ids (one, a comma list or a nested list) is removed. */
function isMarkerRun(run: string): boolean {
  const tokens = run.split(THREAD_SOURCE_MARKER_SEPARATOR).filter(Boolean).map(normaliseToken);
  return tokens.length > 0 && tokens.every((token) => THREAD_SOURCE_MARKER_ID.test(token));
}

/** `[https://x.test/a]` (a bracketed address, not a markdown link) loses its brackets. */
function unwrapBracketedUrl(text: string, open: number): { url: string; end: number } | null {
  if (!THREAD_SOURCE_MARKER_URL_START.test(text.slice(open + 1, open + 9))) {
    return null;
  }
  const limit = Math.min(text.length, open + 1 + THREAD_SOURCE_MARKER_URL_MAX_CHARS);
  let cursor = open + 1;
  while (cursor < limit && !THREAD_SOURCE_MARKER_CLOSERS.has(text.charAt(cursor))) {
    if (/\s/u.test(text.charAt(cursor)) || THREAD_SOURCE_MARKER_OPENERS.has(text.charAt(cursor))) {
      return null;
    }
    cursor += 1;
  }
  if (cursor >= limit || text.charAt(cursor + 1) === '(') {
    return null;
  }
  return { url: text.slice(open + 1, cursor), end: cursor + 1 };
}

/**
 * Removes internal source markers such as `[2f25f199712eec3d]`, `[[id]]`, `[id1, id2]` and
 * `[[id1], [id2]]` from a published body, also when the id carries Arabic-Indic or other local
 * digits, invisible direction marks, or sits in full-width or CJK brackets (`【id】`). A bracketed
 * address `[https://x.test]` keeps the address and loses the brackets. The server already numbers
 * or drops markers (ADR-183); this is the defensive layer for any text that reaches the page
 * unresolved. Numbered citations such as `[1]` and ordinary bracketed text are kept.
 *
 * A linear scan, not one regex over the body: an unclosed `[` cannot make the cost grow with
 * the square of the length (ReDoS).
 */
export function stripUnresolvedSourceMarkers(text: string): string {
  let output = '';
  let index = 0;
  while (index < text.length) {
    let open = index;
    while (open < text.length && !THREAD_SOURCE_MARKER_OPENERS.has(text.charAt(open))) {
      open += 1;
    }
    output += text.slice(index, open);
    if (open >= text.length) {
      break;
    }
    const bracketed = unwrapBracketedUrl(text, open);
    if (bracketed) {
      output += bracketed.url;
      index = bracketed.end;
      continue;
    }
    let runEnd = open + 1;
    while (runEnd < text.length && THREAD_SOURCE_MARKER_RUN_CHARACTER.test(text.charAt(runEnd))) {
      runEnd += 1;
    }
    let close = -1;
    for (let cursor = runEnd - 1; cursor > open; cursor -= 1) {
      if (THREAD_SOURCE_MARKER_CLOSERS.has(text.charAt(cursor))) {
        close = cursor;
        break;
      }
    }
    if (close < 0) {
      output += text.slice(open, runEnd);
      index = runEnd;
      continue;
    }
    const run = text.slice(open, close + 1);
    index = close + 1;
    if (isMarkerRun(run)) {
      // A removed marker between two spaces leaves one space, not two.
      if (/\s$/u.test(output) && /^[ \t]/u.test(text.charAt(index))) {
        index += 1;
      }
    } else {
      output += run;
    }
  }
  return output;
}
