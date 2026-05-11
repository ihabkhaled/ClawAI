import { clamp01, sumsToOne } from '../utilities/normalize.utility';

describe('clamp01', () => {
  it.each([
    [-1, 0],
    [0, 0],
    [0.5, 0.5],
    [1, 1],
    [2, 1],
  ])('clamp01(%s) = %s', (input, expected) => {
    expect(clamp01(input)).toBe(expected);
  });

  it('NaN → 0', () => {
    expect(clamp01(Number.NaN)).toBe(0);
  });
});

describe('sumsToOne', () => {
  it('returns true for exact 1.0', () => {
    expect(sumsToOne([0.5, 0.5], 0.001)).toBe(true);
  });

  it('returns true within tolerance', () => {
    expect(sumsToOne([0.333, 0.333, 0.333], 0.01)).toBe(true);
  });

  it('returns false outside tolerance', () => {
    expect(sumsToOne([0.5, 0.4], 0.001)).toBe(false);
  });
});
