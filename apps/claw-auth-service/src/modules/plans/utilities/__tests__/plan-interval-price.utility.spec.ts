import { BillingIntervalKind } from '../../../../generated/prisma';
import { setPlanIntervalDiscountsSchema } from '../../dto/plan-interval-discounts.dto';
import {
  computeIntervalPriceMinor,
  deriveIntervalPrices,
  discountBpsFor,
} from '../plan-interval-price.utility';

const DEFAULTS = {
  quarterlyDiscountBps: 1000,
  semiannualDiscountBps: 1500,
  yearlyDiscountBps: 2000,
};

describe('computeIntervalPriceMinor', () => {
  it('prices yearly as monthly x 12 x 80 / 100', () => {
    expect(computeIntervalPriceMinor(1200, 12, 2000)).toBe((1200 * 12 * 80) / 100);
    expect(computeIntervalPriceMinor(1200, 12, 2000)).toBe(11520);
  });

  it('keeps the yearly price under twelve monthly payments for every seeded plan', () => {
    for (const monthly of [500, 1000, 2000, 5000, 10000, 20000]) {
      expect(computeIntervalPriceMinor(monthly, 12, 2000)).toBeLessThan(monthly * 12);
    }
  });

  it('rounds once to the nearest minor unit, never a float', () => {
    // 333 x 3 x 0.9 = 899.1 -> 899; 335 x 3 x 0.9 = 904.5 -> 905
    expect(computeIntervalPriceMinor(333, 3, 1000)).toBe(899);
    expect(computeIntervalPriceMinor(335, 3, 1000)).toBe(905);
    expect(Number.isInteger(computeIntervalPriceMinor(777, 6, 1500))).toBe(true);
  });

  it('a 0% discount is the plain multiple', () => {
    expect(computeIntervalPriceMinor(1000, 12, 0)).toBe(12000);
  });
});

describe('deriveIntervalPrices', () => {
  it('gives quarterly 10%, semiannual 15% and yearly 20% by default', () => {
    expect(deriveIntervalPrices(2000, DEFAULTS)).toEqual([
      { billingInterval: 'QUARTERLY', amountMinor: 5400 },
      { billingInterval: 'SEMIANNUAL', amountMinor: 10200 },
      { billingInterval: 'YEARLY', amountMinor: 19200 },
    ]);
  });

  it('never includes MONTHLY', () => {
    expect(
      deriveIntervalPrices(2000, DEFAULTS).some(
        (entry) => entry.billingInterval === BillingIntervalKind.MONTHLY,
      ),
    ).toBe(false);
    expect(discountBpsFor(BillingIntervalKind.MONTHLY, DEFAULTS)).toBe(0);
  });
});

describe('setPlanIntervalDiscountsSchema', () => {
  it('accepts 0 to 90% in whole basis points', () => {
    expect(
      setPlanIntervalDiscountsSchema.safeParse({
        quarterlyDiscountBps: 0,
        semiannualDiscountBps: 1500,
        yearlyDiscountBps: 9000,
      }).success,
    ).toBe(true);
  });

  it.each([-1, 9001, 10000, 12.5, Number.NaN])('rejects %s', (bad) => {
    expect(
      setPlanIntervalDiscountsSchema.safeParse({
        quarterlyDiscountBps: bad,
        semiannualDiscountBps: 1500,
        yearlyDiscountBps: 2000,
      }).success,
    ).toBe(false);
  });

  it('requires all three', () => {
    expect(setPlanIntervalDiscountsSchema.safeParse({ yearlyDiscountBps: 2000 }).success).toBe(
      false,
    );
  });
});
