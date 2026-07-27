import { describe, expect, it } from 'vitest';

import { formatBasisPoints, formatMicroUsd } from '@/utilities/billing-dashboard.utility';

describe('billing dashboard formatting', () => {
  it('formats micro USD exactly without converting through a float', () => {
    expect(formatMicroUsd('12345678')).toBe('USD 12.345678');
    expect(formatMicroUsd('-1')).toBe('-USD 0.000001');
  });

  it('formats integer basis points as a percentage', () => {
    expect(formatBasisPoints(1_234)).toBe('12.34%');
  });
});
