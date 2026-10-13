import { describe, expect, it } from 'vitest';

import {
  applyCorrections,
  escapeLike,
  matchRanges,
  stripControlChars,
  tokenise,
} from '../utilities/board-text.utility';

describe('board text utilities', () => {
  it('strips control characters', () => {
    expect(stripControlChars('a\u0000b\tc\u007fd')).toBe('a b c d');
  });

  it('escapes LIKE wildcards', () => {
    expect(escapeLike('50%_off\\')).toBe('50\\%\\_off\\\\');
  });

  it('tokenises into distinct words', () => {
    expect(tokenise('a b  a c')).toEqual(['a', 'b', 'c']);
  });

  it('maps a match back to the original title', () => {
    expect(matchRanges('Hello World', 'world')).toEqual([[6, 11]]);
  });

  it('maps through accents and merges adjacent ranges', () => {
    expect(matchRanges('Café Crème', 'cafe')).toEqual([[0, 4]]);
    expect(matchRanges('abc abc', 'abc')).toEqual([
      [0, 3],
      [4, 7],
    ]);
    expect(matchRanges('aaaa', 'aa')).toEqual([[0, 4]]);
  });

  it('returns no ranges for an empty query or no hit', () => {
    expect(matchRanges('Hello', '')).toEqual([]);
    expect(matchRanges('Hello', 'zzz')).toEqual([]);
  });

  it('rebuilds a corrected query or null when unchanged', () => {
    expect(
      applyCorrections(['kubernets', 'guide'], [{ token: 'kubernets', word: 'kubernetes' }]),
    ).toBe('kubernetes guide');
    expect(applyCorrections(['guide'], [{ token: 'guide', word: 'guide' }])).toBeNull();
    expect(applyCorrections(['guide'], [])).toBeNull();
  });
});
