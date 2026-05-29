import { estimateTextTokens } from '../estimate-text-tokens.utility';

describe('estimateTextTokens', () => {
  it('returns 0 for an empty string', () => {
    expect(estimateTextTokens('')).toBe(0);
  });

  it('returns 0 for undefined', () => {
    expect(estimateTextTokens(undefined)).toBe(0);
  });

  it('returns 0 for null', () => {
    expect(estimateTextTokens(null)).toBe(0);
  });

  it('uses ceil(length / 4) for normal ASCII text', () => {
    // 'hello world' has length 11 -> ceil(11 / 4) = 3
    expect(estimateTextTokens('hello world')).toBe(3);
  });

  it('rounds up partial tokens', () => {
    expect(estimateTextTokens('a')).toBe(1); // ceil(1/4) = 1
    expect(estimateTextTokens('abcd')).toBe(1); // ceil(4/4) = 1
    expect(estimateTextTokens('abcde')).toBe(2); // ceil(5/4) = 2
  });

  it('handles unicode (Arabic) by code-unit length', () => {
    const arabic = 'مرحبا بك في كلاو';
    expect(estimateTextTokens(arabic)).toBe(Math.ceil(arabic.length / 4));
    expect(estimateTextTokens(arabic)).toBeGreaterThan(0);
  });

  it('handles emoji/surrogate-pair unicode without throwing', () => {
    const emoji = '😀😀😀😀';
    expect(estimateTextTokens(emoji)).toBe(Math.ceil(emoji.length / 4));
  });

  it('never returns a negative number for long text', () => {
    const long = 'x'.repeat(10_000);
    expect(estimateTextTokens(long)).toBe(2500);
  });
});
