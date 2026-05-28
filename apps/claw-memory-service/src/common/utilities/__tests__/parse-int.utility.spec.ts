import { parsePositiveInt } from '../parse-int.utility';

describe('parsePositiveInt', () => {
  it('parses a valid positive integer string', () => {
    expect(parsePositiveInt('3', 1)).toBe(3);
    expect(parsePositiveInt('50', 20)).toBe(50);
  });

  it('returns fallback for undefined / null', () => {
    expect(parsePositiveInt(undefined, 1)).toBe(1);
    expect(parsePositiveInt(null, 20)).toBe(20);
  });

  it('returns fallback for non-numeric input (the 500 regression)', () => {
    expect(parsePositiveInt('abc', 1)).toBe(1);
    expect(parsePositiveInt('1.5', 1)).toBe(1);
    expect(parsePositiveInt('', 7)).toBe(7);
  });

  it('returns fallback for zero / negative', () => {
    expect(parsePositiveInt('0', 1)).toBe(1);
    expect(parsePositiveInt('-5', 20)).toBe(20);
    expect(parsePositiveInt(-3, 9)).toBe(9);
  });

  it('accepts a numeric (non-string) positive integer', () => {
    expect(parsePositiveInt(42, 1)).toBe(42);
  });
});
