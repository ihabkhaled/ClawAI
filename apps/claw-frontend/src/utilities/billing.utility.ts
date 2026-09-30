import {
  BILLING_GATEWAY_ORDER,
  BILLING_INTERVAL_MONTHS,
  USAGE_WARNING_THRESHOLD,
} from '@/constants/billing.constants';
import {
  type BillingGateway,
  BillingInterval,
  SubscriptionStatus,
  UsageTone,
} from '@/enums/billing.enum';
import type {
  AdminPlanIntervalDiscounts,
  IntervalDiscountInputs,
} from '@/types/admin-plan-price.types';
import type {
  BillingPlan,
  ChargeNotice,
  BillingPlanPrice,
  CurrentSubscription,
  FeatureAllowance,
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

export function formatFeatureAllowanceUsage(
  allowance: FeatureAllowance,
  t: TranslateFunction,
): string {
  if (allowance.limit !== null) {
    return t('billing.features.usedOfLimit', {
      used: allowance.used.toLocaleString(),
      limit: formatQuotaLimit(allowance.limit, t),
    });
  }
  return allowance.used > 0
    ? t('billing.usage.usedUnlimited', { used: allowance.used.toLocaleString() })
    : t('billing.quota.unlimited');
}

export function findPlanPrice(
  plan: BillingPlan,
  interval: BillingInterval,
): BillingPlanPrice | null {
  return plan.prices.find((price) => price.billingInterval === interval) ?? null;
}

export function readCheckoutInterval(value: string | null): BillingInterval {
  switch (value) {
    case 'quarterly':
      return BillingInterval.QUARTERLY;
    case 'semiannual':
      return BillingInterval.SEMIANNUAL;
    case 'yearly':
      return BillingInterval.YEARLY;
    default:
      return BillingInterval.MONTHLY;
  }
}

export function isCurrentPlan(
  plan: BillingPlan,
  subscription: CurrentSubscription | null,
): boolean {
  return subscription !== null && subscription.planId === plan.id;
}

/** The three fields a plan price needs for a discount to be read off it. */
export type IntervalPricedPlan = {
  prices: readonly { billingInterval: BillingInterval; amountMinor: number; currency: string }[];
};

/**
 * The discount a longer term gives versus paying monthly, as a whole percent.
 *
 * READ from the two stored prices, never hard-coded: an admin can change a
 * plan's discounts, and a badge that said "20% off" while the price said 15%
 * would be a lie on a pricing page. Integer arithmetic, rounded DOWN to a whole
 * percent so a badge never overstates (12.5% off reads "Save 12%"). Returns 0
 * for MONTHLY, when either price is missing or in another currency, and when
 * the longer term is not actually cheaper, so nothing ever advertises a
 * negative or invented discount.
 */
export function computeIntervalDiscountPercent(
  plan: IntervalPricedPlan,
  interval: BillingInterval,
): number {
  if (interval === BillingInterval.MONTHLY) {
    return 0;
  }
  const monthly = plan.prices.find((price) => price.billingInterval === BillingInterval.MONTHLY);
  const term = plan.prices.find((price) => price.billingInterval === interval);
  if (
    monthly === undefined ||
    term === undefined ||
    monthly.currency !== term.currency ||
    monthly.amountMinor <= 0
  ) {
    return 0;
  }
  const plain = monthly.amountMinor * BILLING_INTERVAL_MONTHS[interval];
  return Math.max(Math.floor(((plain - term.amountMinor) * 100) / plain), 0);
}

/** The largest term discount an admin may set, in basis points (90%). Mirrors auth-service. */
const MAX_DISCOUNT_BPS = 9000;

function isDigits(text: string): boolean {
  return text.length > 0 && [...text].every((char) => char >= '0' && char <= '9');
}

/**
 * A typed percent ("20", "12.5") as integer basis points, or null when it is
 * blank, not a number, negative, has more than two decimals, or is above 90%.
 * Rounded once; never a float sent.
 */
export function parseDiscountPercentToBps(input: string): number | null {
  const [whole = '', fraction, ...rest] = input.trim().split('.');
  const wellFormed =
    rest.length === 0 &&
    isDigits(whole) &&
    whole.length <= 3 &&
    (fraction === undefined || (isDigits(fraction) && fraction.length <= 2));
  if (!wellFormed) {
    return null;
  }
  const bps = Math.round(Number(`${whole}.${fraction ?? '0'}`) * 100);
  return bps <= MAX_DISCOUNT_BPS ? bps : null;
}

/** Basis points as the text an admin edits: 2000 -> "20", 1250 -> "12.5". */
export function bpsToPercentInput(bps: number): string {
  return String(bps / 100);
}

/** A plan's stored discounts as the three text fields the admin edits. */
export function discountsToInputs(discounts: AdminPlanIntervalDiscounts): IntervalDiscountInputs {
  return {
    quarterly: bpsToPercentInput(discounts.quarterlyDiscountBps),
    semiannual: bpsToPercentInput(discounts.semiannualDiscountBps),
    yearly: bpsToPercentInput(discounts.yearlyDiscountBps),
  };
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

/**
 * What to tell someone about the currency they are about to be charged in.
 *
 * Two different promises, so two different sentences.
 *
 * A gateway that settles in the plan's own currency can be quoted EXACTLY,
 * because that amount is the canonical price. One that converts cannot: its
 * total comes from the server's settlement quote at session creation, and that
 * quote is newer than any marketing rate, carries the safety margin and is not
 * commercially rounded. Naming an amount for it here would be quoting a number
 * ClawAI has not computed yet — and if a user later saw a different figure, the
 * checkout would look broken rather than correct.
 *
 * Returns null when nothing needs saying, which is when the displayed price is
 * already the settlement price.
 */
export function buildChargeNotice(
  settlementCurrency: string | null,
  canonicalCurrency: string,
  canonicalAmount: string,
): ChargeNotice | null {
  if (settlementCurrency === null) {
    return { key: 'billing.checkout.chargedExactly', params: { amount: canonicalAmount } };
  }
  if (settlementCurrency === canonicalCurrency) {
    return null;
  }
  return {
    key: 'billing.checkout.chargedInCurrency',
    params: { currency: settlementCurrency },
  };
}
