import { type BillingIntervalKind } from '../../../generated/prisma';
import { type PlanPriceVersionView } from './plan-catalog.types';

/** A plan's term discounts, in basis points (2000 = 20%). */
export type PlanIntervalDiscounts = {
  quarterlyDiscountBps: number;
  semiannualDiscountBps: number;
  yearlyDiscountBps: number;
};

/** The amount a derived interval must charge, given the plan's monthly price. */
export type DerivedIntervalPrice = {
  billingInterval: BillingIntervalKind;
  amountMinor: number;
};

/** One price version to mint inside a price-set transaction. */
export type PriceSetEntry = {
  billingInterval: BillingIntervalKind;
  currency: string;
  amountMinor: number;
  /** Mint even when the active version already has this amount (an admin's explicit publish). */
  force: boolean;
};

/** Everything `PlanBillingRepository.publishPriceSet` writes in one transaction. */
export type PriceSetParams = {
  planId: string;
  entries: PriceSetEntry[];
  /** New discounts to store on the plan first, when the admin changed them. */
  discounts?: PlanIntervalDiscounts;
  /** The legacy `plans.price_monthly/price_yearly` display columns, kept in step. */
  legacyDisplay?: { priceMonthly: number; priceYearly: number | null };
  createdByUserId: string | null;
};

/** What the admin sees after a discount or monthly-price change. */
export type PlanIntervalPricingView = {
  planId: string;
  discounts: PlanIntervalDiscounts;
  /** The ACTIVE version per interval, MONTHLY first. */
  prices: PlanPriceVersionView[];
};
