import {
  HIGH_SURROGATE_MAX,
  HIGH_SURROGATE_MIN,
  TOPIC_READING_MAX_PARTS,
  TOPIC_SPLIT_BREAKS,
  TOPIC_SPLIT_LOOKBACK_SHARE,
} from '../constants/topic-reading.constants';

/** The last index (end of match) of `pattern` inside `text`, or -1. */
function lastBreak(text: string, pattern: RegExp): number {
  let last = -1;
  for (const match of text.matchAll(pattern)) last = match.index + match[0].length;
  return last;
}

function cutPoint(text: string, start: number, partChars: number): number {
  const window = text.slice(start, start + partChars);
  const floor = Math.floor(partChars * (1 - TOPIC_SPLIT_LOOKBACK_SHARE));
  for (const pattern of TOPIC_SPLIT_BREAKS) {
    const at = lastBreak(window.slice(floor), pattern);
    if (at > 0) return start + floor + at;
  }
  const hardEnd = start + partChars;
  const code = text.charCodeAt(hardEnd - 1);
  // Never split a surrogate pair: that leaves a broken character at the end of both parts.
  return code >= HIGH_SURROGATE_MIN && code <= HIGH_SURROGATE_MAX ? hardEnd - 1 : hardEnd;
}

/**
 * Splits a long text into parts of at most `partChars` characters, cutting at a blank line, a line
 * end, a sentence end or a space near the end of each part, and in the middle of a word only when
 * no break exists. The parts joined are exactly the text.
 */
export function splitTopic(text: string, partChars: number): string[] {
  const size = Math.max(1, Math.floor(partChars));
  const parts: string[] = [];
  let start = 0;
  while (text.length - start > size) {
    const end = cutPoint(text, start, size);
    parts.push(text.slice(start, end));
    start = end;
  }
  if (start < text.length) parts.push(text.slice(start));
  return parts;
}

/** The indexes of the parts to read: all of them, or `max` evenly spaced ones, first and last included. */
export function pickPartIndexes(total: number, max = TOPIC_READING_MAX_PARTS): number[] {
  if (total <= max) return Array.from({ length: total }, (_unused, index) => index);
  if (max <= 1) return [0];
  return Array.from({ length: max }, (_unused, k) => Math.round((k * (total - 1)) / (max - 1)));
}
