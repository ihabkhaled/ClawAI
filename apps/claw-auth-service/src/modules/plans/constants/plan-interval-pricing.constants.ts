import { BillingIntervalKind } from '../../../generated/prisma';

/** Months of service one charge buys, per billing interval. */
export const BILLING_INTERVAL_MONTHS: Readonly<Record<BillingIntervalKind, number>> = {
  [BillingIntervalKind.MONTHLY]: 1,
  [BillingIntervalKind.QUARTERLY]: 3,
  [BillingIntervalKind.SEMIANNUAL]: 6,
  [BillingIntervalKind.YEARLY]: 12,
};

/** Intervals whose price is derived from MONTHLY and a per-plan discount. */
export const DERIVED_BILLING_INTERVALS: readonly BillingIntervalKind[] = [
  BillingIntervalKind.QUARTERLY,
  BillingIntervalKind.SEMIANNUAL,
  BillingIntervalKind.YEARLY,
];

/** 100% in basis points. */
export const BASIS_POINTS_DENOMINATOR = 10_000;

/** The largest discount an admin may set (90%). A 100% term would be free. */
export const MAX_INTERVAL_DISCOUNT_BPS = 9_000;

/** Defaults every plan starts with: 10% quarterly, 15% semiannual, 20% yearly. */
export const DEFAULT_INTERVAL_DISCOUNT_BPS = {
  quarterly: 1_000,
  semiannual: 1_500,
  yearly: 2_000,
} as const;

export const PLAN_INTERVAL_PRICE_DERIVED = 'PLAN_INTERVAL_PRICE_DERIVED';
export const PLAN_HAS_NO_MONTHLY_PRICE = 'PLAN_HAS_NO_MONTHLY_PRICE';
