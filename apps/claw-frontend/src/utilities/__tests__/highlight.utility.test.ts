import { describe, expect, it } from 'vitest';

import { splitHighlightSegments } from '@/utilities/highlight.utility';

describe('splitHighlightSegments', () => {
  it('returns a single non-match segment when needle is empty', () => {
    expect(splitHighlightSegments('hello world', '')).toEqual([
      { start: 0, text: 'hello world', isMatch: false },
    ]);
  });

  it('treats whitespace-only needles as empty', () => {
    expect(splitHighlightSegments('hello world', '   ')).toEqual([
      { start: 0, text: 'hello world', isMatch: false },
    ]);
  });

  it('matches case-insensitively', () => {
    const result = splitHighlightSegments('Hello World', 'world');
    expect(result).toEqual([
      { start: 0, text: 'Hello ', isMatch: false },
      { start: 6, text: 'World', isMatch: true },
    ]);
  });

  it('handles multiple non-overlapping matches', () => {
    const result = splitHighlightSegments('abc abc abc', 'abc');
    expect(result.filter((s) => s.isMatch).length).toBe(3);
    // Offsets must be strictly increasing so they can be used as React keys
    expect(result.map((s) => s.start)).toEqual([0, 3, 4, 7, 8]);
  });

  it('produces no segments past the end of the string', () => {
    const result = splitHighlightSegments('aaa', 'aaa');
    expect(result).toEqual([{ start: 0, text: 'aaa', isMatch: true }]);
  });

  it('returns just non-match when needle is absent', () => {
    expect(splitHighlightSegments('hello', 'zzz')).toEqual([
      { start: 0, text: 'hello', isMatch: false },
    ]);
  });
});
