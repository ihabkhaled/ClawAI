import { describe, expect, it } from 'vitest';

import { highlightRanges, trigramSimilarity } from '../board-match-ranges.utility';

describe('highlightRanges', () => {
  it('marks every exact occurrence in the original title', () => {
    expect(highlightRanges('Vector search and vector math', 'vector')).toEqual([
      [0, 6],
      [18, 24],
    ]);
  });

  it('still marks the closest word for a misspelt query', () => {
    expect(highlightRanges('Vector databases explained', 'vectr')).toEqual([[0, 6]]);
  });

  it('marks the best word for each misspelt query word', () => {
    expect(highlightRanges('Solar panels guide', 'solr panls')).toEqual([
      [0, 5],
      [6, 12],
    ]);
  });

  it('returns nothing when no title word is close or the query is empty', () => {
    expect(highlightRanges('Vector databases', 'zzzzzz')).toEqual([]);
    expect(highlightRanges('Vector databases', '')).toEqual([]);
  });

  it('does not fuzzy-match very short words', () => {
    expect(highlightRanges('Go language', 'xo')).toEqual([]);
  });

  it('maps accented titles back to their original offsets', () => {
    expect(highlightRanges('Crème brûlée', 'creme')).toEqual([[0, 5]]);
    expect(highlightRanges('Crème brûlée', 'brulee')).toEqual([[6, 12]]);
  });

  it('finds a word inside an unspaced Chinese title', () => {
    expect(highlightRanges('免疫系统', '免疫')).toEqual([[0, 2]]);
  });
});

describe('trigramSimilarity', () => {
  it('is 1 for equal words and low for unrelated ones', () => {
    expect(trigramSimilarity('vector', 'vector')).toBe(1);
    expect(trigramSimilarity('vector', 'banana')).toBeLessThan(0.1);
  });
});
