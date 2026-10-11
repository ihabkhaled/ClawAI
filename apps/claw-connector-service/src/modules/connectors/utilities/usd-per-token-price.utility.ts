import {
  MAX_PRICE_EXPONENT_MAGNITUDE,
  MAX_PRICE_MICRO_USD_PER_MTOK,
  MICRO_USD_PER_USD,
  PRICE_COLUMN_FRACTION_DIGITS,
  PRICE_DECIMAL_PATTERN,
  PRICE_PER_TOKEN_TO_MICRO_PER_MTOK_EXPONENT,
} from '../constants/model-price.constants';

/**
 * Converts a provider's decimal-string USD-per-token price (OpenRouter:
 * "0.000003") to integer micro-USD per million tokens (3000000). Pure
 * BigInt/decimal-string arithmetic: no float touches the money path.
 *
 * Returns null for anything that is not a usable price: empty, negative (so
 * OpenRouter's "-1" dynamic marker), NaN, malformed, or above $1000/Mtok.
 */
export function usdPerTokenToMicroUsdPerMTok(
  raw: string | number | null | undefined,
): number | null {
  if (raw === null || raw === undefined) {
    return null;
  }
  const match = PRICE_DECIMAL_PATTERN.exec(String(raw).trim());
  if (!match) {
    return null;
  }
  const fraction = match[2] ?? '';
  const exponent =
    (match[3] === undefined ? 0 : Number(match[3])) -
    fraction.length +
    PRICE_PER_TOKEN_TO_MICRO_PER_MTOK_EXPONENT;
  if (Math.abs(exponent) > MAX_PRICE_EXPONENT_MAGNITUDE) {
    return null;
  }
  const digits = BigInt(`${match[1] ?? '0'}${fraction}`);
  const micro =
    exponent >= 0
      ? digits * 10n ** BigInt(exponent)
      : (digits + 10n ** BigInt(-exponent) / 2n) / 10n ** BigInt(-exponent);
  return micro > MAX_PRICE_MICRO_USD_PER_MTOK ? null : Number(micro);
}

/** Integer micro-USD per million tokens as the "USD per million" decimal string the column stores. */
export function microUsdToUsdPerMillionText(micro: number): string {
  const value = BigInt(micro);
  const whole = value / MICRO_USD_PER_USD;
  const fraction = (value % MICRO_USD_PER_USD)
    .toString()
    .padStart(PRICE_COLUMN_FRACTION_DIGITS, '0');
  return `${whole.toString()}.${fraction}`;
}

/** Reads a stored "USD per million" decimal back to integer micro-USD per million; null stays null. */
export function usdPerMillionToMicroUsd(
  stored: { toFixed(digits: number): string } | null | undefined,
): number | undefined {
  if (stored === null || stored === undefined) {
    return undefined;
  }
  const [whole = '0', fraction = ''] = stored.toFixed(PRICE_COLUMN_FRACTION_DIGITS).split('.');
  return Number(BigInt(`${whole}${fraction.padEnd(PRICE_COLUMN_FRACTION_DIGITS, '0')}`));
}
