import { CostClass } from '../../../generated/prisma';
import { costClassFromPrice } from '../utilities/cost-class.utility';

describe('costClassFromPrice', () => {
  it('returns null when price is null', () => {
    expect(costClassFromPrice(null)).toBeNull();
  });

  it.each([
    [0, CostClass.FREE],
    [-1, CostClass.FREE],
    [0.1, CostClass.CHEAP],
    [0.5, CostClass.CHEAP],
    [0.6, CostClass.STANDARD],
    [3, CostClass.STANDARD],
    [5, CostClass.STANDARD],
    [10, CostClass.PREMIUM],
    [30, CostClass.PREMIUM],
    [60, CostClass.ULTRA],
    [1000, CostClass.ULTRA],
  ])('price=%s → class=%s', (price, expected) => {
    expect(costClassFromPrice(price)).toBe(expected);
  });
});
