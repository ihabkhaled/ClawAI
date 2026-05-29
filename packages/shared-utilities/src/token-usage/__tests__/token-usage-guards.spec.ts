import { asRecord, readCount, toTokenCount } from '../token-usage-guards.utility';

describe('asRecord', () => {
  it('returns the object for a plain record', () => {
    const input = { a: 1 };
    expect(asRecord(input)).toBe(input);
  });

  it('returns undefined for null, primitives, and arrays', () => {
    expect(asRecord(null)).toBeUndefined();
    expect(asRecord(undefined)).toBeUndefined();
    expect(asRecord('x')).toBeUndefined();
    expect(asRecord(42)).toBeUndefined();
    expect(asRecord(true)).toBeUndefined();
    expect(asRecord([1, 2])).toBeUndefined();
  });
});

describe('toTokenCount', () => {
  it('returns undefined for null / undefined', () => {
    expect(toTokenCount(null)).toBeUndefined();
    expect(toTokenCount(undefined)).toBeUndefined();
  });

  it('coerces numeric strings', () => {
    expect(toTokenCount('123')).toBe(123);
  });

  it('floors fractional values', () => {
    expect(toTokenCount(10.9)).toBe(10);
  });

  it('treats zero as a valid count', () => {
    expect(toTokenCount(0)).toBe(0);
  });

  it('returns undefined for negatives, NaN, Infinity, and non-numeric strings', () => {
    expect(toTokenCount(-1)).toBeUndefined();
    expect(toTokenCount(Number.NaN)).toBeUndefined();
    expect(toTokenCount(Number.POSITIVE_INFINITY)).toBeUndefined();
    expect(toTokenCount('abc')).toBeUndefined();
    expect(toTokenCount({})).toBeUndefined();
  });
});

describe('readCount', () => {
  it('reads and coerces a count by key', () => {
    expect(readCount({ prompt_tokens: 5 }, 'prompt_tokens')).toBe(5);
  });

  it('returns undefined when the record is undefined', () => {
    expect(readCount(undefined, 'prompt_tokens')).toBeUndefined();
  });

  it('returns undefined when the key is absent', () => {
    expect(readCount({ other: 1 }, 'prompt_tokens')).toBeUndefined();
  });
});
