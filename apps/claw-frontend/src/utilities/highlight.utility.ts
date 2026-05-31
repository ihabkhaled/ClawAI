// Splits a haystack string into ordered segments around case-insensitive
// matches of `needle`. Returns an array of `{ start, text, isMatch }` so the
// caller can render the match segments inside `<mark>` (or any wrapper) and
// use the `start` offset as a stable, collision-free React key. Returns the
// haystack as a single non-match segment when `needle` is empty or
// all-whitespace, so callers can always call this unconditionally.
import type { HighlightSegment } from '@/types';

export function splitHighlightSegments(haystack: string, needle: string): HighlightSegment[] {
  const trimmed = needle.trim();
  if (trimmed.length === 0) {
    return [{ start: 0, text: haystack, isMatch: false }];
  }

  const segments: HighlightSegment[] = [];
  const lowerHay = haystack.toLowerCase();
  const lowerNeedle = trimmed.toLowerCase();
  let cursor = 0;

  while (cursor < haystack.length) {
    const idx = lowerHay.indexOf(lowerNeedle, cursor);
    if (idx === -1) {
      segments.push({ start: cursor, text: haystack.slice(cursor), isMatch: false });
      break;
    }
    if (idx > cursor) {
      segments.push({ start: cursor, text: haystack.slice(cursor, idx), isMatch: false });
    }
    segments.push({ start: idx, text: haystack.slice(idx, idx + trimmed.length), isMatch: true });
    cursor = idx + trimmed.length;
  }

  return segments;
}
