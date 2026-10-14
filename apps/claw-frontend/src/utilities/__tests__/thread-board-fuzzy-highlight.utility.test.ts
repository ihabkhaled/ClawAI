import { describe, expect, it } from 'vitest';

import { fuzzyHighlightRanges } from '../thread-board-fuzzy-highlight.utility';

describe('fuzzyHighlightRanges', () => {
  it('marks the closest word for a typo', () => {
    const title = 'How Vector Databases Find Similar Documents';
    const [range] = fuzzyHighlightRanges(title, 'vectr');
    expect(range).toEqual([4, 10]);
    expect(title.slice(4, 10)).toBe('Vector');
  });

  it('marks one word per typed word and ignores far words', () => {
    const ranges = fuzzyHighlightRanges('Vector databases explained', 'vectr databaes zzzzzz');
    expect(ranges).toEqual([
      [0, 6],
      [7, 16],
    ]);
  });

  it('returns nothing for short or unrelated input', () => {
    expect(fuzzyHighlightRanges('Vector databases', 'a')).toEqual([]);
    expect(fuzzyHighlightRanges('Vector databases', 'xylophone')).toEqual([]);
    expect(fuzzyHighlightRanges('', 'vector')).toEqual([]);
  });

  it('works on non-Latin titles', () => {
    expect(fuzzyHighlightRanges('دليل نوافذ السياق', 'نوافد')).toEqual([[5, 10]]);
  });
});
