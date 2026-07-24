import { BASIS_POINTS_DENOMINATOR, FX_RATE_SCALE } from '@claw/shared-constants';

import { MoneyError } from './money-error';
import { MoneyErrorCode } from './money-error-code.enum';
import {
  assertNonNegativeMinor,
  assertSupportedCurrency,
  minorUnitExponent,
  roundHalfUpDivide,
} from './money.utility';

// Applies the operator-configured safety margin to a raw upstream rate.
//
// The margin protects against the rate moving between quoting and settlement:
// ClawAI quotes slightly high rather than absorbing an FX loss on every charge.
export function applySafetyMarginToRate(sourceRateScaled: number, safetyMarginBps: number): number {
  if (!Number.isInteger(sourceRateScaled) || sourceRateScaled <= 0) {
    throw new MoneyError(
      MoneyErrorCode.INVALID_SCALE,
      'sourceRateScaled must be a positive integer',
    );
  }
  if (!Number.isInteger(safetyMarginBps) || safetyMarginBps < 0) {
    throw new MoneyError(
      MoneyErrorCode.INVALID_SCALE,
      'safetyMarginBps must be a non-negative integer',
    );
  }
  const adjusted = sourceRateScaled * (BASIS_POINTS_DENOMINATOR + safetyMarginBps);
  if (!Number.isSafeInteger(adjusted)) {
    throw new MoneyError(
      MoneyErrorCode.AMOUNT_OVERFLOW,
      'safety-margin adjustment exceeds the safe integer range',
    );
  }
  return roundHalfUpDivide(adjusted, BASIS_POINTS_DENOMINATOR);
}

// Converts a base-currency minor amount into the quote currency using a scaled
// integer rate, correcting for a difference in minor-unit exponents.
//
// The result is the exact total the gateway will be asked to charge; it is bound
// to the checkout session and revalidated against the provider's reported
// amount, so it can never silently drift.
export function convertMinorUnits(
  amountMinor: number,
  baseCurrency: string,
  quoteCurrency: string,
  finalRateScaled: number,
): number {
  assertNonNegativeMinor(amountMinor, 'amountMinor');
  assertSupportedCurrency(baseCurrency);
  assertSupportedCurrency(quoteCurrency);
  if (!Number.isInteger(finalRateScaled) || finalRateScaled <= 0) {
    throw new MoneyError(
      MoneyErrorCode.INVALID_SCALE,
      'finalRateScaled must be a positive integer',
    );
  }

  const exponentDelta = minorUnitExponent(quoteCurrency) - minorUnitExponent(baseCurrency);
  const product = amountMinor * finalRateScaled;
  if (!Number.isSafeInteger(product)) {
    throw new MoneyError(
      MoneyErrorCode.AMOUNT_OVERFLOW,
      'amountMinor * finalRateScaled exceeds the safe integer range',
    );
  }

  // Scale up before dividing so a currency with more decimals does not lose
  // precision to an early truncation.
  const numerator = exponentDelta > 0 ? product * 10 ** exponentDelta : product;
  const denominator = exponentDelta < 0 ? FX_RATE_SCALE * 10 ** -exponentDelta : FX_RATE_SCALE;
  if (!Number.isSafeInteger(numerator)) {
    throw new MoneyError(
      MoneyErrorCode.AMOUNT_OVERFLOW,
      'currency-exponent adjustment exceeds the safe integer range',
    );
  }
  return roundHalfUpDivide(numerator, denominator);
}

// A quote is usable only while unexpired. Callers must re-quote rather than
// charge against a stale rate.
export function isFxQuoteExpired(expiresAtMs: number, nowMs: number): boolean {
  return nowMs >= expiresAtMs;
}

// Converts a human rate ("48.75") into the scaled integer form, without a float.
export function parseRateToScaled(rate: string): number {
  const trimmed = rate.trim();
  if (!/^\d+(\.\d+)?$/.test(trimmed)) {
    throw new MoneyError(MoneyErrorCode.INVALID_DECIMAL_STRING, `"${rate}" is not a valid FX rate`);
  }
  const scaleDigits = Math.log10(FX_RATE_SCALE);
  const [wholePart, fractionPart = ''] = trimmed.split('.');
  if (fractionPart.length > scaleDigits) {
    throw new MoneyError(
      MoneyErrorCode.EXCESSIVE_PRECISION,
      `"${rate}" has more precision than FX_RATE_SCALE supports`,
    );
  }
  const combined = `${wholePart}${fractionPart.padEnd(scaleDigits, '0')}`;
  const value = Number.parseInt(combined, 10);
  if (!Number.isSafeInteger(value)) {
    throw new MoneyError(MoneyErrorCode.AMOUNT_OVERFLOW, 'scaled rate exceeds safe integer range');
  }
  return value;
}
