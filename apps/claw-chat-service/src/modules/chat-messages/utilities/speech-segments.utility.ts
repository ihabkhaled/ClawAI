import {
  SPEECH_CLAUSE_END_PATTERN,
  SPEECH_FIRST_SEGMENT_MAX_CHARACTERS,
  SPEECH_SEGMENT_MAX_CHARACTERS,
  SPEECH_SENTENCE_END_PATTERN,
} from '../constants/speech.constants';
import type { SpeechTextSegment } from '../types/speech.types';
import { speechCharacterCount } from './speakable-text.utility';

/**
 * Splits already-capped speakable text into the segments a progressive
 * "Read aloud" synthesises one by one (2026-09-25). The first segment is at
 * most `firstMax` code points so the first audio arrives in seconds; every
 * later one at most `restMax`.
 *
 * Cut preference inside each window: the last sentence end or line break
 * (Latin/Arabic/Devanagari marks before a space, CJK marks anywhere), else the
 * last clause break (comma, semicolon, colon, dash, Arabic/CJK commas), else
 * the last space — never mid-word. Only a window with no break at all (a
 * space-less CJK run, one enormous token) is cut hard at the limit.
 *
 * Order is kept, nothing is added, whitespace at a cut is dropped. Pure and
 * deterministic. Bounded: every iteration consumes at least one character.
 */
export function segmentSpeakableText(
  text: string,
  firstMax: number = SPEECH_FIRST_SEGMENT_MAX_CHARACTERS,
  restMax: number = SPEECH_SEGMENT_MAX_CHARACTERS,
): SpeechTextSegment[] {
  const segments: SpeechTextSegment[] = [];
  let remaining = text.trim();
  while (remaining.length > 0) {
    const max = Math.max(1, segments.length === 0 ? firstMax : restMax);
    const cut = segmentCutIndex(remaining, max);
    const piece = remaining.slice(0, cut).trim();
    remaining = remaining.slice(cut).trimStart();
    if (piece.length > 0) {
      segments.push({
        index: segments.length,
        text: piece,
        characters: speechCharacterCount(piece),
      });
    }
  }
  return segments;
}

/** UTF-16 index at which the next segment of `remaining` ends (always ≥ 1). */
function segmentCutIndex(remaining: string, maxCharacters: number): number {
  const points = [...remaining];
  if (points.length <= maxCharacters) {
    return remaining.length;
  }
  const window = points.slice(0, maxCharacters).join('');
  const sentence = Math.max(
    lastMatchEnd(window, SPEECH_SENTENCE_END_PATTERN),
    lastLineBreak(window),
  );
  if (sentence > 0) {
    return sentence;
  }
  const clause = lastMatchEnd(window, SPEECH_CLAUSE_END_PATTERN);
  if (clause > 0) {
    return clause;
  }
  const space = window.search(/\s\S*$/);
  // No break at all (a space-less CJK run, one enormous token): cut at the limit.
  return space > 0 ? space : window.length;
}

/** Index just past the last match of `pattern` in `window`, or -1. */
function lastMatchEnd(window: string, pattern: RegExp): number {
  let end = -1;
  for (const match of window.matchAll(pattern)) {
    end = match.index + match[0].length;
  }
  return end;
}

/** Index just past the last line break in `window`, or -1. */
function lastLineBreak(window: string): number {
  const at = window.lastIndexOf('\n');
  return at < 0 ? -1 : at + 1;
}
