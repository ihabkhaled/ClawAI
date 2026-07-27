import { MARKETING_COMPACT_PLAN_SLUGS } from '@/constants/marketing-home.constants';
import type { PublicPlan, PublicPlanPrice } from '@/types/public-pricing.types';

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

export function resolvePlanPrice(plan: PublicPlan, isYearly: boolean): PublicPlanPrice | null {
  const interval = isYearly ? 'YEARLY' : 'MONTHLY';
  return plan.prices.find((price) => price.isActive && price.billingInterval === interval) ?? null;
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
