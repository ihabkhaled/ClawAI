import { ConnectorCreditHeadroomFormat } from '@claw/shared-types';

import {
  MICRO_USD_DECIMALS,
  MICRO_USD_PARSE_DECIMALS,
  UNKNOWN_CREDIT_HEADROOM,
  UNLIMITED_CREDIT_HEADROOM,
} from '../constants/credit-headroom.constants';
import { type ProviderCreditHeadroom } from '../types/credit-headroom.types';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/**
 * A provider's USD amount (a JSON number) as integer micro-USD, FLOORED.
 *
 * Providers send balances as floats. No `parseFloat`/`Math.round` (rule 37 §3):
 * the value is rendered to a fixed decimal string one digit past micro-USD and
 * the digits are truncated, so float noise can never round a balance up.
 * `undefined` for anything that is not a finite number.
 */
export function usdAmountToMicroUsdFloor(value: unknown): number | undefined {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return undefined;
  }
  if (value <= 0) {
    return 0;
  }
  const [whole = '0', fraction = ''] = value.toFixed(MICRO_USD_PARSE_DECIMALS).split('.');
  const microDigits = fraction.slice(0, MICRO_USD_DECIMALS).padEnd(MICRO_USD_DECIMALS, '0');
  return Number.parseInt(whole, 10) * 10 ** MICRO_USD_DECIMALS + Number.parseInt(microDigits, 10);
}

/** OpenRouter `/key` (`limit_remaining`) or `/credits` (`total_credits - total_usage`). */
function parseOpenRouter(body: unknown): ProviderCreditHeadroom {
  const data = isRecord(body) ? body['data'] : undefined;
  if (!isRecord(data)) {
    return UNKNOWN_CREDIT_HEADROOM;
  }
  if ('limit_remaining' in data) {
    const remaining = data['limit_remaining'];
    if (remaining === null) {
      return UNLIMITED_CREDIT_HEADROOM;
    }
    const micro = usdAmountToMicroUsdFloor(remaining);
    return micro === undefined
      ? UNKNOWN_CREDIT_HEADROOM
      : { known: true, remainingMicroUsd: micro };
  }
  const credits = usdAmountToMicroUsdFloor(data['total_credits']);
  const usage = usdAmountToMicroUsdFloor(data['total_usage']);
  return credits === undefined || usage === undefined
    ? UNKNOWN_CREDIT_HEADROOM
    : { known: true, remainingMicroUsd: Math.max(0, credits - usage) };
}

/** One key-credit endpoint's response, read per the preset's declared format. */
export function parseCreditHeadroom(
  format: ConnectorCreditHeadroomFormat,
  body: unknown,
): ProviderCreditHeadroom {
  switch (format) {
    case ConnectorCreditHeadroomFormat.OPENROUTER:
      return parseOpenRouter(body);
  }
}

/**
 * Several readings of one key as one: the smallest known balance binds (a key
 * limit below the account balance, or the reverse); unlimited only when every
 * known reading is unlimited; unknown when nothing was read.
 */
export function combineCreditHeadroom(
  readings: readonly ProviderCreditHeadroom[],
): ProviderCreditHeadroom {
  const known = readings.filter((reading) => reading.known);
  const limited = known
    .map((reading) => reading.remainingMicroUsd)
    .filter((remaining): remaining is number => remaining !== null);
  if (limited.length > 0) {
    return { known: true, remainingMicroUsd: Math.min(...limited) };
  }
  return known.length > 0 ? UNLIMITED_CREDIT_HEADROOM : UNKNOWN_CREDIT_HEADROOM;
}
