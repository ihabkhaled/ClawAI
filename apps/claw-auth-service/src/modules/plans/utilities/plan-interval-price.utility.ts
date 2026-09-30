import { BillingIntervalKind } from '../../../generated/prisma';
import {
  BASIS_POINTS_DENOMINATOR,
  BILLING_INTERVAL_MONTHS,
  DERIVED_BILLING_INTERVALS,
} from '../constants/plan-interval-pricing.constants';
import {
  type DerivedIntervalPrice,
  type PlanIntervalDiscounts,
} from '../types/plan-interval-pricing.types';

/**
 * What one charge for `months` months costs after a discount, in minor units.
 *
 * Integer arithmetic only: `monthly x months x (10000 - bps) / 10000`, rounded
 * once to the nearest minor unit. Yearly at 20% is exactly
 * `monthly x 12 x 80 / 100`.
 */
export function computeIntervalPriceMinor(
  monthlyMinor: number,
  months: number,
  discountBps: number,
): number {
  return Math.round(
    (monthlyMinor * months * (BASIS_POINTS_DENOMINATOR - discountBps)) / BASIS_POINTS_DENOMINATOR,
  );
}

/** The discount that applies to a derived interval. MONTHLY has none. */
export function discountBpsFor(
  interval: BillingIntervalKind,
  discounts: PlanIntervalDiscounts,
): number {
  switch (interval) {
    case BillingIntervalKind.QUARTERLY:
      return discounts.quarterlyDiscountBps;
    case BillingIntervalKind.SEMIANNUAL:
      return discounts.semiannualDiscountBps;
    case BillingIntervalKind.YEARLY:
      return discounts.yearlyDiscountBps;
    case BillingIntervalKind.MONTHLY:
      return 0;
  }
}

/** Every derived interval's amount for a plan's monthly price and discounts. */
export function deriveIntervalPrices(
  monthlyMinor: number,
  discounts: PlanIntervalDiscounts,
): DerivedIntervalPrice[] {
  return DERIVED_BILLING_INTERVALS.map((billingInterval) => ({
    billingInterval,
    amountMinor: computeIntervalPriceMinor(
      monthlyMinor,
      BILLING_INTERVAL_MONTHS[billingInterval],
      discountBpsFor(billingInterval, discounts),
    ),
  }));
}
