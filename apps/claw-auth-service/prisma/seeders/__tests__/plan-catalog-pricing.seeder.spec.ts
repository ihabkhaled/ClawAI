const { computeDiscountedIntervalMinor } = require('../plan-catalog.seeder.cjs');

describe('computeDiscountedIntervalMinor', () => {
  it('applies a 10% discount over three months', () => {
    // 1000 minor/month × 3 × 0.90 = 2700
    expect(computeDiscountedIntervalMinor(1000, 3)).toBe(2700);
  });

  it('applies a 10% discount over six months', () => {
    // 1000 minor/month × 6 × 0.90 = 5400
    expect(computeDiscountedIntervalMinor(1000, 6)).toBe(5400);
  });

  it('rounds to the nearest integer minor unit rather than truncating', () => {
    // 999 × 3 × 0.90 = 2697.3 -> rounds to 2697
    expect(computeDiscountedIntervalMinor(999, 3)).toBe(2697);
    // 505 × 3 × 0.90 = 1363.5 -> rounds to 1364 (round-half-up)
    expect(computeDiscountedIntervalMinor(505, 3)).toBe(1364);
  });

  it('never returns a float', () => {
    expect(Number.isInteger(computeDiscountedIntervalMinor(1333, 6))).toBe(true);
  });
});
