import { calculateMarginMicroUsd, sumMicroUsd, usdMinorToMicroUsd } from '../micro-usd.utility';

describe('micro USD arithmetic', () => {
  it('converts USD minor units exactly', () => {
    expect(usdMinorToMicroUsd(1_999)).toBe(19_990_000n);
  });

  it('calculates positive and negative margin without floating point', () => {
    expect(calculateMarginMicroUsd(20_000_000n, 12_345_678n)).toBe(7_654_322n);
    expect(calculateMarginMicroUsd(1_000_000n, 2_000_000n)).toBe(-1_000_000n);
  });

  it('sums arbitrary-size micro USD values', () => {
    expect(sumMicroUsd([9_007_199_254_740_992n, 8n])).toBe(9_007_199_254_741_000n);
  });
});
