import { normalizeSearchText } from './board-search-normalizer.utility';
import {
  BOARD_FUZZY_MIN_SIMILARITY,
  BOARD_MIN_FUZZY_WORD_LENGTH,
  BOARD_TRIGRAM_SIZE,
} from '../constants/board-index.constants';
import type {
  BoardHighlightRange,
  BoardTextSpan,
  BoardTitleToken,
} from '../types/board-index.types';

/** Normalises char by char so every normalised character maps back to its original span. */
function normaliseWithSpans(original: string): { text: string; spans: BoardTextSpan[] } {
  let text = '';
  const spans: BoardTextSpan[] = [];
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

function trigramsOf(word: string): Set<string> {
  const padded = `  ${word} `;
  const grams = new Set<string>();
  for (let at = 0; at + BOARD_TRIGRAM_SIZE <= padded.length; at += 1) {
    grams.add(padded.slice(at, at + BOARD_TRIGRAM_SIZE));
  }
  return grams;
}

/** pg_trgm style similarity of two words, 0 to 1. */
export function trigramSimilarity(left: string, right: string): number {
  const a = trigramsOf(left);
  const b = trigramsOf(right);
  let shared = 0;
  for (const gram of a) if (b.has(gram)) shared += 1;
  const union = a.size + b.size - shared;
  return union === 0 ? 0 : shared / union;
}

function titleTokens(text: string, spans: readonly BoardTextSpan[]): BoardTitleToken[] {
  const tokens: BoardTitleToken[] = [];
  let from = 0;
  for (const part of text.split(' ')) {
    const first = spans.at(from);
    const last = spans.at(from + part.length - 1);
    if (part.length > 0 && first && last) {
      tokens.push({ text: part, start: first[0], end: last[1] });
    }
    from += part.length + 1;
  }
  return tokens;
}

function exactRanges(
  text: string,
  spans: readonly BoardTextSpan[],
  word: string,
): BoardHighlightRange[] {
  const found: BoardHighlightRange[] = [];
  let from = text.indexOf(word);
  while (from !== -1) {
    const first = spans.at(from);
    const last = spans.at(from + word.length - 1);
    if (first && last) found.push([first[0], last[1]]);
    from = text.indexOf(word, from + word.length);
  }
  return found;
}

/** The title word closest to a misspelt query word, by trigram overlap; null when nothing is close. */
function closestToken(tokens: readonly BoardTitleToken[], word: string): BoardTitleToken | null {
  if (word.length < BOARD_MIN_FUZZY_WORD_LENGTH) return null;
  let best: BoardTitleToken | null = null;
  let bestScore = BOARD_FUZZY_MIN_SIMILARITY;
  for (const token of tokens) {
    const score = trigramSimilarity(word, token.text);
    if (score > bestScore) {
      best = token;
      bestScore = score;
    }
  }
  return best;
}

function mergeRanges(ranges: BoardHighlightRange[]): BoardHighlightRange[] {
  ranges.sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  const merged: BoardHighlightRange[] = [];
  for (const range of ranges) {
    const tail = merged.at(-1);
    if (tail && range[0] <= tail[1]) tail[1] = Math.max(tail[1], range[1]);
    else merged.push([range[0], range[1]]);
  }
  return merged;
}

/**
 * Highlight ranges [start, end) in the ORIGINAL title for each word of the normalised query, merged and
 * sorted. A word found as an exact substring highlights every occurrence; a misspelt word highlights the
 * title word with the best trigram overlap, so "vectr" still marks "Vector".
 */
export function highlightRanges(title: string, normalisedQuery: string): BoardHighlightRange[] {
  const words = [...new Set(normalisedQuery.split(' ').filter((word) => word.length > 0))];
  if (words.length === 0) return [];
  const { text, spans } = normaliseWithSpans(title);
  const tokens = titleTokens(text, spans);
  const ranges: BoardHighlightRange[] = [];
  for (const word of words) {
    const exact = exactRanges(text, spans, word);
    if (exact.length > 0) {
      ranges.push(...exact);
      continue;
    }
    const close = closestToken(tokens, word);
    if (close) ranges.push([close.start, close.end]);
  }
  return mergeRanges(ranges);
}
