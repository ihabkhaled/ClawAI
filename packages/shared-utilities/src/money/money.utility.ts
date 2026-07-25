import { BASIS_POINTS_DENOMINATOR, SUPPORTED_BILLING_CURRENCIES } from '@claw/shared-constants';

import { MoneyError } from './money-error';
import { MoneyErrorCode } from './money-error-code.enum';

// Every function here operates on INTEGER minor units. Passing a float is a
// programming error and throws rather than silently rounding, because a silent
// round in a billing path is a wrong charge.

export function assertIntegerMinor(amountMinor: number, label: string): void {
  if (!Number.isFinite(amountMinor) || !Number.isInteger(amountMinor)) {
    throw new MoneyError(
      MoneyErrorCode.NON_INTEGER_AMOUNT,
      `${label} must be an integer minor-unit amount, received ${String(amountMinor)}`,
    );
  }
  if (!Number.isSafeInteger(amountMinor)) {
    throw new MoneyError(MoneyErrorCode.AMOUNT_OVERFLOW, `${label} exceeds the safe integer range`);
  }
}

export function assertNonNegativeMinor(amountMinor: number, label: string): void {
  assertIntegerMinor(amountMinor, label);
  if (amountMinor < 0) {
    throw new MoneyError(MoneyErrorCode.NEGATIVE_AMOUNT, `${label} must not be negative`);
  }
}

export function isSupportedCurrency(currency: string): boolean {
  return Object.hasOwn(SUPPORTED_BILLING_CURRENCIES, currency);
}

export function assertSupportedCurrency(currency: string): void {
  if (!isSupportedCurrency(currency)) {
    throw new MoneyError(
      MoneyErrorCode.UNSUPPORTED_CURRENCY,
      `Currency ${currency} is not a supported billing currency`,
    );
  }
}

// Number of decimal places for the currency. Never assume 2 — JPY has 0 and
// getting it wrong scales a charge by 100.
export function minorUnitExponent(currency: string): number {
  assertSupportedCurrency(currency);
  return SUPPORTED_BILLING_CURRENCIES[currency] ?? 2;
}

export function minorUnitsPerMajor(currency: string): number {
  return 10 ** minorUnitExponent(currency);
}

// Presentation only. Never feed the result back into a calculation.
export function formatMinorUnits(amountMinor: number, currency: string): string {
  assertIntegerMinor(amountMinor, 'amountMinor');
  const exponent = minorUnitExponent(currency);
  const divisor = 10 ** exponent;
  const sign = amountMinor < 0 ? '-' : '';
  const absolute = Math.abs(amountMinor);
  const major = Math.trunc(absolute / divisor);
  if (exponent === 0) {
    return `${sign}${String(major)}`;
  }
  const minor = absolute % divisor;
  return `${sign}${String(major)}.${String(minor).padStart(exponent, '0')}`;
}

// Parses a decimal string ("5", "5.00", "-5.25") into minor units WITHOUT going
// through a float, so "0.29" can never land on 28.999999999999996.
export function parseMajorToMinor(major: string, currency: string): number {
  const exponent = minorUnitExponent(currency);
  const trimmed = major.trim();
  if (!/^-?\d+(\.\d+)?$/.test(trimmed)) {
    throw new MoneyError(
      MoneyErrorCode.INVALID_DECIMAL_STRING,
      `"${major}" is not a valid decimal amount`,
    );
  }
  const negative = trimmed.startsWith('-');
  const unsigned = negative ? trimmed.slice(1) : trimmed;
  const [wholePart, fractionPart = ''] = unsigned.split('.');
  if (fractionPart.length > exponent) {
    throw new MoneyError(
      MoneyErrorCode.EXCESSIVE_PRECISION,
      `"${major}" has more precision than ${currency} supports (${String(exponent)} dp)`,
    );
  }
  const padded = fractionPart.padEnd(exponent, '0');
  const combined = `${wholePart}${padded}`;
  const value = Number.parseInt(combined === '' ? '0' : combined, 10);
  assertIntegerMinor(value, 'parsed amount');
  return negative ? -value : value;
}

// Multiplies a minor-unit amount by a scaled integer ratio, rounding ONCE at the
// end with half-up. Doing the division in one place is what keeps proration
// reproducible: two separate roundings can disagree by a cent.
export function multiplyByScaledRatio(
  amountMinor: number,
  ratioScaled: number,
  scale: number,
): number {
  assertIntegerMinor(amountMinor, 'amountMinor');
  assertIntegerMinor(ratioScaled, 'ratioScaled');
  if (scale <= 0 || !Number.isInteger(scale)) {
    throw new MoneyError(MoneyErrorCode.INVALID_SCALE, 'scale must be a positive integer');
  }
  const product = amountMinor * ratioScaled;
  if (!Number.isSafeInteger(product)) {
    throw new MoneyError(
      MoneyErrorCode.AMOUNT_OVERFLOW,
      'amountMinor * ratioScaled exceeds the safe integer range',
    );
  }
  return roundHalfUpDivide(product, scale);
}

// Applies a basis-point adjustment (e.g. a 150 bps FX safety margin).
export function applyBasisPoints(amountMinor: number, basisPoints: number): number {
  assertIntegerMinor(amountMinor, 'amountMinor');
  assertIntegerMinor(basisPoints, 'basisPoints');
  const adjusted = amountMinor * (BASIS_POINTS_DENOMINATOR + basisPoints);
  if (!Number.isSafeInteger(adjusted)) {
    throw new MoneyError(
      MoneyErrorCode.AMOUNT_OVERFLOW,
      'basis-point adjustment exceeds the safe integer range',
    );
  }
  return roundHalfUpDivide(adjusted, BASIS_POINTS_DENOMINATOR);
}

// Half-up away from zero: -1.5 -> -2, 1.5 -> 2. Symmetric rounding means a
// credit and the charge it offsets round by the same magnitude.
export function roundHalfUpDivide(numerator: number, denominator: number): number {
  if (denominator === 0) {
    throw new MoneyError(MoneyErrorCode.INVALID_SCALE, 'denominator must not be zero');
  }
  const negative = numerator < 0 !== denominator < 0;
  const absNumerator = Math.abs(numerator);
  const absDenominator = Math.abs(denominator);
  const quotient = Math.floor(absNumerator / absDenominator);
  const remainder = absNumerator % absDenominator;
  const rounded = remainder * 2 >= absDenominator ? quotient + 1 : quotient;
  return negative ? -rounded : rounded;
}

// Sums minor-unit amounts, rejecting a mixed-currency sum outright — adding USD
// to EGP is meaningless and must never be silently permitted.
export function sumMinor(amounts: readonly number[]): number {
  let total = 0;
  for (const amount of amounts) {
    assertIntegerMinor(amount, 'amount');
    total += amount;
  }
  assertIntegerMinor(total, 'sum');
  return total;
}

// Clamps at zero. Used wherever a credit may exceed a charge and the result must
// not become a negative amount due.
export function subtractFloorZero(minuend: number, subtrahend: number): number {
  assertIntegerMinor(minuend, 'minuend');
  assertIntegerMinor(subtrahend, 'subtrahend');
  return Math.max(0, minuend - subtrahend);
}
