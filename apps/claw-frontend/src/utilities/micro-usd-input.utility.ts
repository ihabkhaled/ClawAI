const MICRO_USD_PER_USD = 1_000_000;
const MAX_MICRO_USD = 1_000_000_000;
const WHOLE_DIGITS_PATTERN = /^\d+$/u;
const FRACTION_DIGITS_PATTERN = /^\d{1,6}$/u;

/**
 * An admin's dollar amount as integer micro-USD. Blank is `null` (none); anything that is not a
 * non-negative amount with at most six decimals is `undefined` (invalid). Done on the decimal
 * text, never through a float, so `0.07` is exactly 70000.
 */
export function usdInputToMicroUsd(value: unknown): number | null | undefined {
  if (value === null || value === undefined) {
    return null;
  }
  const text = typeof value === 'number' ? String(value) : value;
  if (typeof text !== 'string') {
    return undefined;
  }
  const trimmed = text.trim();
  if (trimmed === '') {
    return null;
  }
  const parts = trimmed.split('.');
  const [whole = '', fraction = ''] = parts;
  const hasValidFraction =
    parts.length === 1 || (parts.length === 2 && FRACTION_DIGITS_PATTERN.test(fraction));
  if (!WHOLE_DIGITS_PATTERN.test(whole) || !hasValidFraction) {
    return undefined;
  }
  const micro = Number(whole) * MICRO_USD_PER_USD + Number(fraction.padEnd(6, '0'));
  return Number.isSafeInteger(micro) && micro <= MAX_MICRO_USD ? micro : undefined;
}

/** Integer micro-USD as the dollar text an admin edits ("" for none). */
export function microUsdToUsdInput(micro: number | null | undefined): string {
  if (micro === null || micro === undefined) {
    return '';
  }
  const whole = Math.trunc(micro / MICRO_USD_PER_USD);
  const fraction = String(micro % MICRO_USD_PER_USD)
    .padStart(6, '0')
    .replace(/0+$/u, '');
  return fraction === '' ? String(whole) : `${String(whole)}.${fraction}`;
}
