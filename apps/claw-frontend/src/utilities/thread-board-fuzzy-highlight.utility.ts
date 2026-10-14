const WORD_PATTERN = /[\p{L}\p{N}]+/gu;
const MIN_TERM_LENGTH = 2;

/** Edit distance with an early exit once it passes `limit`; returns limit + 1 when too far. */
function boundedDistance(a: string, b: string, limit: number): number {
  if (Math.abs(a.length - b.length) > limit) {
    return limit + 1;
  }
  let previous = Array.from({ length: b.length + 1 }, (_, index) => index);
  for (let i = 1; i <= a.length; i += 1) {
    const current = [i];
    let rowMin = i;
    for (let j = 1; j <= b.length; j += 1) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      const value = Math.min(
        (previous[j] ?? 0) + 1,
        (current[j - 1] ?? 0) + 1,
        (previous[j - 1] ?? 0) + cost,
      );
      current.push(value);
      rowMin = Math.min(rowMin, value);
    }
    if (rowMin > limit) {
      return limit + 1;
    }
    previous = current;
  }
  return previous[b.length] ?? limit + 1;
}

function allowedDistance(termLength: number): number {
  return termLength <= 4 ? 1 : 2;
}

/**
 * Fallback highlight for a misspelled query ("vectr"): the API sends no ranges for fuzzy hits, so
 * mark the closest title word for each typed word. Exact matches are left to the API's own ranges.
 */
export function fuzzyHighlightRanges(title: string, query: string): [number, number][] {
  const terms = (query.toLowerCase().match(WORD_PATTERN) ?? []).filter(
    (term) => term.length >= MIN_TERM_LENGTH,
  );
  if (terms.length === 0) {
    return [];
  }
  const words = Array.from(title.matchAll(WORD_PATTERN), (match) => ({
    start: match.index,
    end: match.index + match[0].length,
    text: match[0].toLowerCase(),
  }));
  const ranges: [number, number][] = [];
  for (const term of terms) {
    const limit = allowedDistance(term.length);
    let best: { start: number; end: number; distance: number } | null = null;
    for (const word of words) {
      const distance = boundedDistance(term, word.text, limit);
      if (distance <= limit && (best === null || distance < best.distance)) {
        best = { start: word.start, end: word.end, distance };
      }
    }
    if (best !== null) {
      ranges.push([best.start, best.end]);
    }
  }
  return ranges;
}
