import { MARKETING_COMPACT_PLAN_SLUGS } from '@/constants/marketing-home.constants';
import { BillingInterval } from '@/enums/billing.enum';
import type { PublicPlan, PublicPlanPrice } from '@/types/public-pricing.types';
import { monthlyCreditFromPlan } from '@/utilities/credit.utility';

export function formatPlanPrice(price: PublicPlanPrice, locale: string): string {
  const fractionDigits = getCurrencyFractionDigits(price.currency);
  const value = formatPriceDecimal(price);
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: price.currency,
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  }).format(Number(value));
}

export function formatPriceDecimal(price: PublicPlanPrice): string {
  const fractionDigits = getCurrencyFractionDigits(price.currency);
  const divisor = 10 ** fractionDigits;
  const whole = Math.trunc(price.amountMinor / divisor);
  const remainder = price.amountMinor % divisor;
  return `${whole}.${remainder.toString().padStart(fractionDigits, '0')}`;
}

export function formatPlanQuota(
  quota: number | null,
  disabledLabel: string,
  unlimitedLabel: string,
  locale: string,
): string {
  if (quota === null) {
    return unlimitedLabel;
  }
  if (quota === 0) {
    return disabledLabel;
  }
  return new Intl.NumberFormat(locale).format(quota);
}

export function resolvePlanPrice(
  plan: PublicPlan,
  interval: BillingInterval,
): PublicPlanPrice | null {
  return plan.prices.find((price) => price.isActive && price.billingInterval === interval) ?? null;
}

/**
 * The connector credit this plan grants each month, in integer micro-USD.
 *
 * Derived, never stored: `monthly price × paygCreditPercentBps`. Always the
 * MONTHLY price, even while the card is showing yearly figures, because the
 * grant lands monthly and the wallet is credited from the monthly price either
 * way. Reading the yearly amount here would advertise twelve times the credit.
 *
 * A plan with no active monthly price, a $0 price, or a 0 bps rate derives 0 —
 * which the card renders as "no connector credit", not "$0.00".
 */
export function resolvePlanMonthlyCreditMicroUsd(plan: PublicPlan): number {
  const monthly = resolvePlanPrice(plan, BillingInterval.MONTHLY);
  if (monthly === null) {
    return 0;
  }
  return monthlyCreditFromPlan(monthly.amountMinor, plan.paygCreditPercentBps);
}

export function filterPublicPlans(
  plans: ReadonlyArray<PublicPlan>,
  compact: boolean,
): ReadonlyArray<PublicPlan> {
  if (!compact) {
    return plans;
  }
  return plans.filter((plan) => MARKETING_COMPACT_PLAN_SLUGS.includes(plan.slug));
}

function getCurrencyFractionDigits(currency: string): number {
  return (
    new Intl.NumberFormat('en', {
      style: 'currency',
      currency,
    }).resolvedOptions().maximumFractionDigits ?? 2
  );
}
