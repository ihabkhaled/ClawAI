import {
  DISPLAY_BASE_CURRENCY,
  DISPLAY_FX_MAX_RATE_SCALED,
  DISPLAY_FX_MIN_RATE_SCALED,
  FX_RATE_SCALE,
  SUPPORTED_DISPLAY_CURRENCIES,
} from '@claw/shared-constants';

import { MoneyError } from './money-error';
import { MoneyErrorCode } from './money-error-code.enum';

// DISPLAY-ONLY conversion.
//
// This file is the twin of fx.utility.ts and shares none of its policy. There
// is no safety margin here, because a margin exists to protect ClawAI when it
// charges — applying it to a price nobody is being charged would just inflate
// every localized price by 1.5% for no reason.
//
// It also deliberately does NOT call assertSupportedCurrency: that guard
// defends the set of currencies ClawAI can CHARGE in, and display is a much
// wider set. Using the billing guard here would be the first step towards the
// two sets becoming one.

export function isSupportedDisplayCurrency(currency: string): boolean {
  return Object.hasOwn(SUPPORTED_DISPLAY_CURRENCIES, currency);
}

// Normalizes and validates a currency code arriving from a cookie, a query
// string or a saved preference. Returns null rather than throwing: an unknown
// code is a visitor with a stale cookie, not an exceptional condition, and the
// answer is simply to show USD.
export function normalizeDisplayCurrency(candidate: string | null | undefined): string | null {
  if (candidate === null || candidate === undefined) {
    return null;
  }
  const normalized = candidate.trim().toUpperCase();
  if (!/^[A-Z]{3}$/.test(normalized) || !isSupportedDisplayCurrency(normalized)) {
    return null;
  }
  return normalized;
}

export function displayMinorUnitExponent(currency: string): number {
  const exponent = SUPPORTED_DISPLAY_CURRENCIES[currency];
  if (exponent === undefined) {
    throw new MoneyError(
      MoneyErrorCode.UNSUPPORTED_CURRENCY,
      `Currency ${currency} is not a supported display currency`,
    );
  }
  return exponent;
}

// A rate outside these bounds is a broken upstream, not a currency.
//
// The bounds are enormous on purpose. A narrow percentage cap around yesterday's
// rate looks prudent and then rejects a real devaluation — exactly the week the
// localized price matters most. Reject the impossible, not the alarming.
export function isSaneDisplayRate(rateScaled: number): boolean {
  return (
    Number.isSafeInteger(rateScaled) &&
    rateScaled >= DISPLAY_FX_MIN_RATE_SCALED &&
    rateScaled <= DISPLAY_FX_MAX_RATE_SCALED
  );
}

// Converts a canonical minor amount into a display currency's minor units.
//
// Signed: refunds and credits render negative and must keep their sign, unlike
// the settlement converter which rejects a negative amount outright because a
// negative charge is meaningless.
export function convertMinorForDisplay(
  amountMinor: number,
  baseCurrency: string,
  quoteCurrency: string,
  rateScaled: number,
): number {
  if (!Number.isSafeInteger(amountMinor)) {
    throw new MoneyError(
      MoneyErrorCode.NON_INTEGER_AMOUNT,
      'amountMinor must be a safe integer minor-unit amount',
    );
  }
  if (!isSaneDisplayRate(rateScaled)) {
    throw new MoneyError(MoneyErrorCode.INVALID_SCALE, 'rateScaled is outside the sane FX range');
  }
  if (baseCurrency === quoteCurrency) {
    return amountMinor;
  }

  const exponentDelta =
    displayMinorUnitExponent(quoteCurrency) - displayMinorUnitExponent(baseCurrency);

  // BigInt throughout. A weak currency against a large balance overflows the
  // safe-integer range easily — 1e11 minor units at a 1e7-scaled rate is past
  // 2^53 — and the settlement converter is allowed to throw there because a
  // checkout should fail loudly. A wallet page must not.
  const product = BigInt(amountMinor) * BigInt(rateScaled);
  const numerator = exponentDelta > 0 ? product * 10n ** BigInt(exponentDelta) : product;
  const denominator =
    exponentDelta < 0
      ? BigInt(FX_RATE_SCALE) * 10n ** BigInt(-exponentDelta)
      : BigInt(FX_RATE_SCALE);

  const rounded = roundHalfUpDivideBigInt(numerator, denominator);
  if (rounded > BigInt(Number.MAX_SAFE_INTEGER) || rounded < BigInt(Number.MIN_SAFE_INTEGER)) {
    throw new MoneyError(
      MoneyErrorCode.AMOUNT_OVERFLOW,
      'converted display amount exceeds the safe integer range',
    );
  }
  return Number(rounded);
}

// Half-up away from zero, matching roundHalfUpDivide exactly so a display
// amount and its settlement counterpart never disagree on a .5 boundary for a
// reason as silly as one of them using BigInt.
function roundHalfUpDivideBigInt(numerator: bigint, denominator: bigint): bigint {
  if (denominator === 0n) {
    throw new MoneyError(MoneyErrorCode.INVALID_SCALE, 'denominator must not be zero');
  }
  const negative = numerator < 0n !== denominator < 0n;
  const absNumerator = numerator < 0n ? -numerator : numerator;
  const absDenominator = denominator < 0n ? -denominator : denominator;
  const quotient = absNumerator / absDenominator;
  const remainder = absNumerator % absDenominator;
  const rounded = remainder * 2n >= absDenominator ? quotient + 1n : quotient;
  return negative ? -rounded : rounded;
}

// Parses an upstream decimal rate ("48.7512345678") into scaled integer form.
//
// Unlike the settlement parser this TRUNCATES excess precision instead of
// throwing. A settlement quote should refuse a rate it cannot represent
// exactly; a marketing page should not go blank because a free API returned a
// seventeenth decimal place.
export function parseDisplayRateToScaled(rate: string | number): number | null {
  const raw = typeof rate === 'number' ? rate.toFixed(12) : rate.trim();
  if (!/^\d+(\.\d+)?$/.test(raw)) {
    return null;
  }
  const scaleDigits = Math.log10(FX_RATE_SCALE);
  const [wholePart, fractionPart = ''] = raw.split('.');
  const truncated = fractionPart.slice(0, scaleDigits).padEnd(scaleDigits, '0');
  const value = Number.parseInt(`${wholePart}${truncated}`, 10);
  if (!isSaneDisplayRate(value)) {
    return null;
  }
  return value;
}

export { DISPLAY_BASE_CURRENCY };
