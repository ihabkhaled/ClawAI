import {
  computeWilsonScoreInterval,
  computeWinsorizedWeightedAverage,
} from '../utilities/routing-education-statistics.utility';

describe('computeWilsonScoreInterval', () => {
  it('returns the maximally uncertain interval for zero samples', () => {
    expect(computeWilsonScoreInterval(0.6, 0)).toEqual({ lowerBound: 0, upperBound: 1 });
  });

  it('always brackets the point estimate', () => {
    const cases: Array<{ successRate: number; sampleSize: number }> = [
      { successRate: 0, sampleSize: 2 },
      { successRate: 1, sampleSize: 2 },
      { successRate: 0.5, sampleSize: 5 },
      { successRate: 0.9, sampleSize: 50 },
      { successRate: 0.1, sampleSize: 1 },
    ];
    for (const { successRate, sampleSize } of cases) {
      const interval = computeWilsonScoreInterval(successRate, sampleSize);
      expect(interval.lowerBound).toBeLessThanOrEqual(successRate);
      expect(interval.upperBound).toBeGreaterThanOrEqual(successRate);
      expect(interval.lowerBound).toBeGreaterThanOrEqual(0);
      expect(interval.upperBound).toBeLessThanOrEqual(1);
    }
  });

  it('narrows as the sample size grows', () => {
    const thin = computeWilsonScoreInterval(0.7, 2);
    const thick = computeWilsonScoreInterval(0.7, 200);

    const thinWidth = thin.upperBound - thin.lowerBound;
    const thickWidth = thick.upperBound - thick.lowerBound;

    expect(thickWidth).toBeLessThan(thinWidth);
  });

  it('clamps an out-of-range successRate before computing the interval', () => {
    // Defensive: a caller passing a value outside [0, 1] (should not happen
    // given clamp01 upstream) must not produce an interval outside [0, 1] or
    // a NaN from a negative variance term.
    const interval = computeWilsonScoreInterval(1.4, 10);
    expect(interval.lowerBound).toBeGreaterThanOrEqual(0);
    expect(interval.upperBound).toBeLessThanOrEqual(1);
    expect(Number.isNaN(interval.lowerBound)).toBe(false);
    expect(Number.isNaN(interval.upperBound)).toBe(false);
  });
});

describe('computeWinsorizedWeightedAverage', () => {
  it('returns zero for an empty sample set', () => {
    expect(computeWinsorizedWeightedAverage([], 30_000)).toBe(0);
  });

  it('averages ordinary in-range samples without clamping', () => {
    const result = computeWinsorizedWeightedAverage(
      [
        { value: 1_000, weight: 1 },
        { value: 2_000, weight: 1 },
      ],
      30_000,
    );
    expect(result).toBe(1_500);
  });

  it('clamps a single wildly anomalous sample to the ceiling, even with only two observations', () => {
    // The whole reason this is a fixed ceiling and not a median-deviation
    // statistic: with exactly two points, both are always equidistant from
    // their own median, so a purely statistical outlier test could never
    // flag either one. A fixed ceiling has no such blind spot.
    const result = computeWinsorizedWeightedAverage(
      [
        { value: 1_400, weight: 1 },
        { value: 60_000, weight: 1 }, // the pack's example: a 60s spike
      ],
      30_000,
    );
    expect(result).toBe((1_400 + 30_000) / 2);
    expect(result).toBeLessThan((1_400 + 60_000) / 2);
  });

  it('clamps a below-floor sample up to the floor', () => {
    const result = computeWinsorizedWeightedAverage(
      [
        { value: -50, weight: 1 },
        { value: 100, weight: 1 },
      ],
      30_000,
      0,
    );
    expect(result).toBe((0 + 100) / 2);
  });

  it('respects sample weight, not just value', () => {
    const heavy = computeWinsorizedWeightedAverage(
      [
        { value: 100, weight: 9 },
        { value: 1_000, weight: 1 },
      ],
      30_000,
    );
    // Weighted toward the heavier, low sample: (100*9 + 1000*1) / 10 = 190.
    expect(heavy).toBe(190);
  });
});
