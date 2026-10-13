import type { HighlightSegment } from '@/types/thread-board-search.types';

/** Clamp, sort and merge offsets, then cut `text` into plain/matched runs. Pure data, no HTML. */
export function splitHighlightSegments(
  text: string,
  ranges: [number, number][],
): HighlightSegment[] {
  const clean = ranges
    .map(([a, b]): [number, number] => [
      Math.max(0, Math.min(a, b)),
      Math.min(text.length, Math.max(a, b)),
    ])
    .filter(([a, b]) => b > a)
    .sort((x, y) => x[0] - y[0]);
  const merged: [number, number][] = [];
  for (const range of clean) {
    const last = merged[merged.length - 1];
    if (last && range[0] <= last[1]) {
      last[1] = Math.max(last[1], range[1]);
    } else {
      merged.push([range[0], range[1]]);
    }
  }
  const segments: HighlightSegment[] = [];
  let cursor = 0;
  for (const [a, b] of merged) {
    if (a > cursor) {
      segments.push({ start: cursor, text: text.slice(cursor, a), match: false });
    }
    segments.push({ start: a, text: text.slice(a, b), match: true });
    cursor = b;
  }
  if (cursor < text.length) {
    segments.push({ start: cursor, text: text.slice(cursor), match: false });
  }
  return segments;
}

export function formatBoardTotal(total: number, capped: boolean): string {
  return capped ? `${total}+` : String(total);
}

export function formatBoardDate(iso: string, locale: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) {
    return '';
  }
  try {
    return new Intl.DateTimeFormat(locale, { dateStyle: 'medium' }).format(date);
  } catch {
    return new Intl.DateTimeFormat('en', { dateStyle: 'medium' }).format(date);
  }
}

export function formatBoardType(type: string): string {
  return type.replaceAll(/[-_]/g, ' ').toLowerCase();
}
