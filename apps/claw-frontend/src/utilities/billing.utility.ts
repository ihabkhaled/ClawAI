import { BILLING_GATEWAY_ORDER, USAGE_WARNING_THRESHOLD } from '@/constants/billing.constants';
import {
  type BillingGateway,
  BillingInterval,
  SubscriptionStatus,
  UsageTone,
} from '@/enums/billing.enum';
import type {
  BillingPlan,
  BillingPlanPrice,
  CurrentSubscription,
  UsageWindow,
} from '@/types/billing.types';
import type { TranslateFunction } from '@/types/i18n.types';

// How many minor units make one major unit for a currency. Read from Intl
// rather than hardcoded to 100: JPY has no minor unit at all, and dividing a
// yen amount by 100 would render a price a hundred times too small.
function resolveMinorUnitDivisor(currency: string): number {
  try {
    const digits = new Intl.NumberFormat(undefined, {
      style: 'currency',
      currency,
    }).resolvedOptions().maximumFractionDigits;
    return 10 ** (digits ?? 2);
  } catch {
    // An unknown currency code should not blow up a billing page. Two decimals
    // is the overwhelmingly common case and the amount still renders.
    return 100;
  }
}

export function parseMajorAmountToMinor(value: string, currency: string): number | null {
  return parseMajorAmount(value, currency, false);
}

export function parsePlanPriceMajorToMinor(value: string, currency: string): number | null {
  return parseMajorAmount(value, currency, true);
}

function parseMajorAmount(value: string, currency: string, allowZero: boolean): number | null {
  const parts = value.trim().split('.');
  const whole = parts.at(0) ?? '';
  const fraction = parts.at(1) ?? '';
  if (
    parts.length > 2 ||
    whole.length === 0 ||
    !isAsciiDigits(whole) ||
    (parts.length === 2 && (fraction.length === 0 || !isAsciiDigits(fraction)))
  ) {
    return null;
  }
  const divisor = resolveMinorUnitDivisor(currency);
  const fractionDigits = Math.log10(divisor);
  if (fraction.length > fractionDigits) {
    return null;
  }
  const amount = BigInt(whole) * BigInt(divisor);
  const fractionMinor = fraction.length === 0 ? 0n : BigInt(fraction.padEnd(fractionDigits, '0'));
  const total = amount + fractionMinor;
  if ((!allowZero && total <= 0n) || total < 0n || total > BigInt(Number.MAX_SAFE_INTEGER)) {
    return null;
  }
  return Number(total);
}

function isAsciiDigits(value: string): boolean {
  for (const character of value) {
    if (character < '0' || character > '9') {
      return false;
    }
  }
  return true;
}

/**
 * Format an integer minor-unit amount for display.
 *
 * Display only. The value returned here is never sent back to the server and
 * never used to compute a charge — the authoritative amount lives in the
 * immutable price version and the server's proration quote.
 */
export function formatMinorAmount(amountMinor: number, currency: string, locale?: string): string {
  const major = amountMinor / resolveMinorUnitDivisor(currency);
  try {
    return new Intl.NumberFormat(locale, { style: 'currency', currency }).format(major);
  } catch {
    return `${major.toFixed(2)} ${currency}`;
  }
}

/**
 * Fraction of a quota window consumed, or null when the window is unlimited.
 *
 * `null` (unlimited) and `0` (disabled) are different states and are kept
 * different here: a disabled window reports a full bar, not an empty one.
 */
export function computeUsageRatio(used: number, limit: number | null): number | null {
  if (limit === null) {
    return null;
  }
  if (limit <= 0) {
    return 1;
  }
  return Math.min(used / limit, 1);
}

export function resolveUsageTone(ratio: number | null): UsageTone {
  if (ratio === null) {
    return UsageTone.UNLIMITED;
  }
  if (ratio >= 1) {
    return UsageTone.EXHAUSTED;
  }
  if (ratio >= USAGE_WARNING_THRESHOLD) {
    return UsageTone.WARNING;
  }
  return UsageTone.NORMAL;
}

export function computeUsageWindowPercent(window: UsageWindow): number {
  const ratio = computeUsageRatio(window.used, window.limit);
  return ratio === null ? 0 : Math.round(ratio * 100);
}

/** Human label for a quota ceiling, keeping unlimited and disabled distinct. */
export function formatQuotaLimit(limit: number | null, t: TranslateFunction): string {
  if (limit === null) {
    return t('billing.quota.unlimited');
  }
  if (limit <= 0) {
    return t('billing.quota.disabled');
  }
  return limit.toLocaleString();
}

export function findPlanPrice(
  plan: BillingPlan,
  interval: BillingInterval,
): BillingPlanPrice | null {
  return plan.prices.find((price) => price.billingInterval === interval) ?? null;
}

export function isCurrentPlan(
  plan: BillingPlan,
  subscription: CurrentSubscription | null,
): boolean {
  return subscription !== null && subscription.planId === plan.id;
}

/**
 * Yearly saving versus paying monthly for twelve months, in minor units.
 * Returns 0 when either price is missing or yearly is not actually cheaper, so
 * the UI never advertises a negative discount.
 */
export function computeYearlySavingMinor(plan: BillingPlan): number {
  const monthly = findPlanPrice(plan, BillingInterval.MONTHLY);
  const yearly = findPlanPrice(plan, BillingInterval.YEARLY);
  if (monthly === null || yearly === null || monthly.currency !== yearly.currency) {
    return 0;
  }
  return Math.max(monthly.amountMinor * 12 - yearly.amountMinor, 0);
}

/**
 * Narrow an arbitrary string to a known gateway, or null.
 *
 * The select only ever emits values we rendered, but narrowing by lookup keeps
 * the cast out of the component and means an unknown value fails closed rather
 * than being forwarded to the checkout call.
 */
export function parseBillingGateway(value: string): BillingGateway | null {
  return BILLING_GATEWAY_ORDER.find((gateway) => gateway === value) ?? null;
}

/** True while the subscription still entitles the user, even if it is ending. */
export function isSubscriptionEntitling(subscription: CurrentSubscription | null): boolean {
  if (subscription === null) {
    return false;
  }
  return (
    subscription.status === SubscriptionStatus.ACTIVE ||
    subscription.status === SubscriptionStatus.CANCEL_AT_PERIOD_END ||
    subscription.status === SubscriptionStatus.PAST_DUE
  );
}
