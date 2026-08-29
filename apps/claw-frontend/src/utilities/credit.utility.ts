import {
  BASIS_POINTS_DENOMINATOR,
  MICRO_USD_PER_MINOR_UNIT,
  MICRO_USD_PER_USD,
} from '@claw/shared-constants';
import type {
  CreditPackageView,
  PaygLedgerEntryView,
  PaygWalletSnapshot,
} from '@claw/shared-types';

import {
  CREDIT_BALANCE_FRACTION_DIGITS,
  CREDIT_LEDGER_FRACTION_DIGITS,
  CREDIT_LEDGER_HIDDEN_KINDS,
  CREDIT_LEDGER_KIND_LABEL_KEYS,
  CREDIT_PRECISE_DISPLAY_THRESHOLD_MICRO_USD,
  CREDIT_WALLET_CURRENCY,
  PAYG_BADGE_PROVIDERS,
  PAYG_SURFACE_LABEL_KEYS,
} from '@/constants/credit.constants';
import type { TranslateFunction } from '@/types/i18n.types';

const MICRO_USD_PER_USD_BIG = BigInt(MICRO_USD_PER_USD);
const PERCENT_SCALE = 100n;
const BASIS_POINTS_DENOMINATOR_BIG = BigInt(BASIS_POINTS_DENOMINATOR);
const MICRO_USD_PER_MINOR_UNIT_BIG = BigInt(MICRO_USD_PER_MINOR_UNIT);
/** Basis points in one whole percent. 100 bps = 1%. */
const BASIS_POINTS_PER_PERCENT = BASIS_POINTS_DENOMINATOR / 100;

/**
 * Splits an integer micro-USD amount into a sign and a fixed-point decimal
 * string, using BigInt only.
 *
 * Every piece of arithmetic on money in this file happens here, in integers. A
 * balance is authoritative to the micro-dollar; `50_000 / 10_000` looks harmless
 * and is exactly the kind of division that turns 0.05 into 0.05000000000000001
 * and a ledger that no longer sums to the wallet.
 */
function toDecimalString(microUsd: number, fractionDigits: number): string {
  const rounded = Math.trunc(microUsd);
  const isNegative = rounded < 0;
  const absolute = BigInt(isNegative ? -rounded : rounded);
  // Scale down from 6 decimal places to the requested precision by integer
  // division, rounding half-up on the discarded remainder.
  const divisor = 10n ** BigInt(6 - fractionDigits);
  const scaled = (absolute + divisor / 2n) / divisor;
  const unit = 10n ** BigInt(fractionDigits);
  const whole = scaled / unit;
  const fraction = scaled % unit;
  const fractionText =
    fractionDigits === 0 ? '' : `.${fraction.toString().padStart(fractionDigits, '0')}`;
  return `${isNegative ? '-' : ''}${whole.toString()}${fractionText}`;
}

/**
 * How many decimals this amount deserves.
 *
 * A wallet with $0.0043 left is in a completely different situation from one
 * with $0.00, and two decimals cannot tell them apart.
 */
function resolveFractionDigits(microUsd: number): number {
  const absolute = Math.abs(Math.trunc(microUsd));
  return absolute > 0 && absolute < CREDIT_PRECISE_DISPLAY_THRESHOLD_MICRO_USD
    ? CREDIT_LEDGER_FRACTION_DIGITS
    : CREDIT_BALANCE_FRACTION_DIGITS;
}

/**
 * Renders an integer micro-USD amount as a localized currency string.
 *
 * The decimal value is derived by BigInt arithmetic above; `Intl` is used only
 * to place the currency symbol and localize the digits (Arabic-Indic numerals
 * for `ar`, and the correct bidi ordering for RTL). No float ever participates
 * in deciding WHAT the number is — only in printing it.
 */
export function formatMicroUsd(microUsd: number, locale?: string, fractionDigits?: number): string {
  const digits = fractionDigits ?? resolveFractionDigits(microUsd);
  const decimal = toDecimalString(microUsd, digits);
  try {
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: CREDIT_WALLET_CURRENCY,
      minimumFractionDigits: digits,
      maximumFractionDigits: digits,
    }).format(Number(decimal));
  } catch {
    // An unknown locale must not blow up a billing page. The exact decimal
    // string is still correct; only the localization is lost.
    return `${decimal} ${CREDIT_WALLET_CURRENCY}`;
  }
}

/** A signed ledger delta, with an explicit `+` so a credit reads as a credit. */
export function formatMicroUsdDelta(microUsd: number, locale?: string): string {
  const formatted = formatMicroUsd(microUsd, locale, CREDIT_LEDGER_FRACTION_DIGITS);
  return microUsd > 0 ? `+${formatted}` : formatted;
}

/**
 * Converts a major-unit string typed by an operator into integer micro-USD.
 *
 * Parsed digit by digit rather than with `parseFloat` for the same reason the
 * plan-price parser is: `parseFloat('1.005') * 1e6` is 1004999.9999999999, and
 * an operator who typed one number would publish another.
 */
export function parseMajorToMicroUsd(value: string, allowNegative = false): number | null {
  const trimmed = value.trim();
  if (trimmed.length === 0) {
    return null;
  }
  const isNegative = trimmed.startsWith('-');
  if (isNegative && !allowNegative) {
    return null;
  }
  const unsigned = isNegative ? trimmed.slice(1) : trimmed;
  const parts = unsigned.split('.');
  const whole = parts.at(0) ?? '';
  const fraction = parts.at(1) ?? '';
  if (parts.length > 2 || whole.length === 0 || !isAsciiDigits(whole)) {
    return null;
  }
  if (parts.length === 2 && (fraction.length === 0 || !isAsciiDigits(fraction))) {
    return null;
  }
  if (fraction.length > 6) {
    return null;
  }
  const total = BigInt(whole) * MICRO_USD_PER_USD_BIG + BigInt(fraction.padEnd(6, '0'));
  if (total > BigInt(Number.MAX_SAFE_INTEGER)) {
    return null;
  }
  const signed = isNegative ? -total : total;
  return Number(signed);
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
 * Fraction of the period grant already consumed, or null when the plan grants
 * no credit at all.
 *
 * `null` (no allowance on this plan) and `0` (a full allowance, untouched) are
 * different states and stay different: a plan with no credit must not render a
 * green, empty bar that implies there is something to spend.
 */
export function computeCreditConsumedRatio(wallet: PaygWalletSnapshot): number | null {
  if (wallet.periodGrantMicroUsd <= 0) {
    return null;
  }
  const consumed = Math.max(wallet.periodGrantMicroUsd - wallet.grantMicroUsd, 0);
  return Math.min(consumed / wallet.periodGrantMicroUsd, 1);
}

/** Whole-percent of the period grant consumed. Integer arithmetic, no rounding drift. */
export function computeCreditConsumedPercent(wallet: PaygWalletSnapshot): number {
  if (wallet.periodGrantMicroUsd <= 0) {
    return 0;
  }
  const consumed = BigInt(Math.max(wallet.periodGrantMicroUsd - wallet.grantMicroUsd, 0));
  const percent = (consumed * PERCENT_SCALE) / BigInt(wallet.periodGrantMicroUsd);
  return Math.min(Number(percent), 100);
}

/**
 * Width of the GRANT segment of the two-bucket bar, as a whole percent of the
 * bar's total capacity (this period's grant plus whatever was purchased).
 *
 * The two buckets are drawn as two segments rather than one number because they
 * are a promise to the customer, not an implementation detail: grant is swept at
 * the period roll and purchased credit never expires. A single bar would let a
 * user believe the money they paid for resets on the first of the month.
 */
export function computeGrantSegmentPercent(wallet: PaygWalletSnapshot): number {
  const capacity = wallet.periodGrantMicroUsd + wallet.purchasedMicroUsd;
  if (capacity <= 0) {
    return 0;
  }
  const percent = (BigInt(Math.max(wallet.grantMicroUsd, 0)) * PERCENT_SCALE) / BigInt(capacity);
  return Math.min(Number(percent), 100);
}

export function computePurchasedSegmentPercent(wallet: PaygWalletSnapshot): number {
  const capacity = wallet.periodGrantMicroUsd + wallet.purchasedMicroUsd;
  if (capacity <= 0) {
    return 0;
  }
  const percent =
    (BigInt(Math.max(wallet.purchasedMicroUsd, 0)) * PERCENT_SCALE) / BigInt(capacity);
  return Math.min(Number(percent), 100);
}

/** True while the wallet actually gates anything. Admins and a disabled kill switch do not. */
export function isCreditMetered(wallet: PaygWalletSnapshot | null): boolean {
  return wallet !== null && wallet.meteringEnabled && !wallet.adminBypass;
}

/** True when this plan grants no monthly credit and none has been bought. */
export function hasNoCreditAllowance(wallet: PaygWalletSnapshot): boolean {
  return wallet.periodGrantMicroUsd <= 0 && wallet.purchasedMicroUsd <= 0;
}

/** Purchased credit never expires, so the reset date is about the grant only. */
export function formatGrantReset(
  wallet: PaygWalletSnapshot,
  locale: string,
  t: TranslateFunction,
): string {
  if (wallet.periodGrantMicroUsd <= 0) {
    return t('billing.credit.neverExpires');
  }
  const parsed = new Date(wallet.grantResetsAt);
  if (Number.isNaN(parsed.getTime())) {
    return t('billing.credit.neverExpires');
  }
  return t('billing.credit.resetsOn', {
    date: new Intl.DateTimeFormat(locale, { dateStyle: 'medium' }).format(parsed),
  });
}

export function resolveLedgerKindLabelKey(entry: PaygLedgerEntryView): string {
  return CREDIT_LEDGER_KIND_LABEL_KEYS[entry.kind];
}

export function resolveSurfaceLabelKey(entry: PaygLedgerEntryView): string | null {
  return entry.surface === null ? null : PAYG_SURFACE_LABEL_KEYS[entry.surface];
}

/**
 * Drops the hold/release pairs.
 *
 * They net to zero and never represent money the user actually spent, so
 * including them doubles the table and makes the running balance appear to
 * bounce for no reason the reader can see.
 */
export function filterVisibleLedgerEntries(
  entries: readonly PaygLedgerEntryView[],
): PaygLedgerEntryView[] {
  return entries.filter((entry) => !CREDIT_LEDGER_HIDDEN_KINDS.includes(entry.kind));
}

/**
 * Whether the composer should badge this provider as spending credit.
 *
 * Display only. `model-selector.tsx` carries a written invariant that model
 * selection is never disabled client-side, and the server's connector policy —
 * which an administrator can flip at runtime — is the only authority.
 */
export function isPaygBadgedProvider(provider: string): boolean {
  return PAYG_BADGE_PROVIDERS.includes(provider);
}

/**
 * The monthly connector credit a plan grants, in integer micro-USD.
 *
 * Connector credit is a SHARE OF WHAT THE USER PAYS, not a per-plan figure an
 * operator types in. `priceMinor` is the plan's active MONTHLY price in cents —
 * the monthly price even for a yearly subscriber, because the grant is monthly —
 * and `bps` is `Plan.paygCreditPercentBps`, where 3000 means 30%. Pay $20.00
 * (2000 cents) on a 30% plan and this returns 6_000_000 micro-USD: $6.00.
 *
 * A $0 price therefore derives $0 of credit. That is the intended answer, not a
 * bug: nothing was paid, so there is no share of it.
 *
 * Mirrors `creditFromPayment` in the auth service exactly, and for the same
 * reasons. All-integer, multiplied BEFORE dividing, computed in `bigint` so a
 * large price cannot silently exceed `Number.MAX_SAFE_INTEGER` on the way
 * through, and rounded DOWN — rounding a grant up would promise credit the
 * payment does not cover, which is wrong in the direction that costs money.
 */
export function monthlyCreditFromPlan(priceMinor: number, bps: number): number {
  if (!Number.isInteger(priceMinor) || priceMinor <= 0) {
    return 0;
  }
  if (!Number.isInteger(bps) || bps <= 0) {
    return 0;
  }
  const clampedBps = BigInt(Math.min(bps, BASIS_POINTS_DENOMINATOR));
  const microUsd =
    (BigInt(priceMinor) * MICRO_USD_PER_MINOR_UNIT_BIG * clampedBps) / BASIS_POINTS_DENOMINATOR_BIG;
  return Number(microUsd);
}

/**
 * A basis-point rate as the percent text the copy interpolates: 3000 → "30".
 *
 * Integer arithmetic on the remainder rather than `bps / 100`, so a rate that is
 * not a whole percent (2550 → "25.5") prints exactly what it is instead of a
 * float artefact. Trailing zeros are dropped: 2550 is "25.5", never "25.50".
 */
export function formatCreditRatePercent(bps: number): string {
  if (!Number.isInteger(bps) || bps <= 0) {
    return '0';
  }
  const clamped = Math.min(bps, BASIS_POINTS_DENOMINATOR);
  const remainder = clamped % BASIS_POINTS_PER_PERCENT;
  const whole = (clamped - remainder) / BASIS_POINTS_PER_PERCENT;
  if (remainder === 0) {
    return String(whole);
  }
  const fraction = String(remainder).padStart(2, '0').replace(/0+$/u, '');
  return `${String(whole)}.${fraction}`;
}

/**
 * The plan's monthly connector credit, for the public pricing card.
 *
 * The FIGURE is derived from the plan's own price and rate, never from i18n
 * copy. An allowance written into thirteen locale files is thirteen numbers an
 * operator must remember to change, and the first edit that misses one
 * publishes a price we do not honour. Only the "none" wording is translated.
 *
 * A plan whose derived credit is 0 — a free plan, or a 0 bps rate — gets the
 * "no connector credit" wording rather than "$0.00", which reads as a broken
 * number instead of an absent benefit.
 */
export function formatPlanConnectorCredit(
  microUsd: number | null | undefined,
  noneLabel: string,
  locale: string,
): string {
  if (microUsd === null || microUsd === undefined || microUsd <= 0) {
    return noneLabel;
  }
  return formatMicroUsd(microUsd, locale);
}

/** Sorts packages the way an operator ordered them, cheapest first on a tie. */
export function sortCreditPackages(packages: readonly CreditPackageView[]): CreditPackageView[] {
  return [...packages].sort(
    (a, b) => a.displayOrder - b.displayOrder || a.priceMinor - b.priceMinor,
  );
}
