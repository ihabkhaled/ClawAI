import type { BoardNormalisedTitle } from '../types/board.types';
import { normalizeSearchText } from '../../board-index/utilities/board-search-normalizer.utility';

function isControl(code: number): boolean {
  return code < 0x20 || (code >= 0x7f && code <= 0x9f);
}

/** Replaces control characters with a space so they cannot reach SQL text or logs. */
export function stripControlChars(text: string): string {
  let out = '';
  for (const char of text) {
    const code = char.codePointAt(0) ?? 0;
    out += isControl(code) ? ' ' : char;
  }
  return out;
}

/** Escapes LIKE wildcards so user text is matched literally (ESCAPE '\'). */
export function escapeLike(text: string): string {
  return text.replaceAll(/[\\%_]/g, String.raw`\$&`);
}

/** Splits normalised text into its distinct words. */
export function tokenise(normalised: string): string[] {
  return [...new Set(normalised.split(' ').filter((word) => word.length > 0))];
}

/** Normalises char by char so a match in the normalised title maps back to the original. */
function normaliseWithSpans(original: string): BoardNormalisedTitle {
  let text = '';
  const spans: [number, number][] = [];
  let index = 0;
  for (const char of original) {
    const end = index + char.length;
    const piece = /\s/u.test(char) ? ' ' : normalizeSearchText(char);
    text += piece;
    for (let unit = 0; unit < piece.length; unit += 1) spans.push([index, end]);
    index = end;
  }
  return { text, spans };
}

/** Highlight ranges [start, end) in the ORIGINAL title for each query word, merged and sorted. */
export function matchRanges(title: string, normalisedQuery: string): [number, number][] {
  const words = tokenise(normalisedQuery);
  if (words.length === 0) return [];
  const { text, spans } = normaliseWithSpans(title);
  const ranges: [number, number][] = [];
  for (const word of words) {
    let from = text.indexOf(word);
    while (from !== -1) {
      const first = spans.at(from);
      const last = spans.at(from + word.length - 1);
      if (first && last) ranges.push([first[0], last[1]]);
      from = text.indexOf(word, from + word.length);
    }
  }
  ranges.sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  const merged: [number, number][] = [];
  for (const range of ranges) {
    const tail = merged.at(-1);
    if (tail && range[0] <= tail[1]) tail[1] = Math.max(tail[1], range[1]);
    else merged.push([range[0], range[1]]);
  }
  return merged;
}

/** Rebuilds the query with each misspelt word replaced; null when nothing changed. */
export function applyCorrections(
  tokens: readonly string[],
  corrections: readonly { token: string; word: string }[],
): string | null {
  const byToken = new Map(corrections.map((entry) => [entry.token, entry.word]));
  let changed = false;
  const rebuilt = tokens.map((token) => {
    const word = byToken.get(token);
    if (word && word !== token) {
      changed = true;
      return word;
    }
    return token;
  });
  return changed ? rebuilt.join(' ') : null;
}
