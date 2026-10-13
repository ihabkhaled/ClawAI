import { describe, expect, it } from 'vitest';

import { formatBoardTotal, splitHighlightSegments } from '../board-highlight.utility';

describe('splitHighlightSegments', () => {
  it('cuts matched runs and keeps the rest plain', () => {
    expect(splitHighlightSegments('hello world', [[0, 5]])).toEqual([
      { start: 0, text: 'hello', match: true },
      { start: 5, text: ' world', match: false },
    ]);
  });

  it('merges overlaps, clamps and drops empty ranges', () => {
    const out = splitHighlightSegments('abcdef', [
      [1, 3],
      [2, 4],
      [4, 4],
      [5, 99],
    ]);
    expect(out.map((s) => [s.text, s.match])).toEqual([
      ['a', false],
      ['bcd', true],
      ['e', false],
      ['f', true],
    ]);
  });

  it('works on RTL text', () => {
    const out = splitHighlightSegments('مرحبا بالعالم', [[0, 5]]);
    expect(out[0]).toEqual({ start: 0, text: 'مرحبا', match: true });
    expect(out.map((s) => s.text).join('')).toBe('مرحبا بالعالم');
  });
});

describe('totals', () => {
  it('marks a capped total', () => {
    expect(formatBoardTotal(100, true)).toBe('100+');
    expect(formatBoardTotal(7, false)).toBe('7');
  });
});
