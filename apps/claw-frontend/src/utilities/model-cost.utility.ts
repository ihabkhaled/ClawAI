import {
  MICRO_USD_DECIMALS,
  MICRO_USD_PER_USD,
  MODEL_COST_EMPTY_SOURCE_COUNTS,
  MODEL_COST_RATE_MAX_MICRO_USD,
  MODEL_COST_RATE_MIN_DECIMALS,
  MODEL_COST_RATE_MAX_DECIMAL_PLACES,
  MODEL_COST_RATE_MAX_INTEGER_DIGITS,
  MODEL_PRICING_SOURCE_RANK,
} from '@/constants/model-cost.constants';
import {
  ModelPricingSourceFilter,
  type ModelPricingSource,
} from '@/enums/model-pricing-source.enum';
import type { ModelCostCatalogRow, ModelCostSourceCounts } from '@/types/model-cost.types';

/**
 * An integer count of micro-USD as a decimal string, WITHOUT floating point.
 *
 * `value / 1_000_000` is a float division and `toFixed` rounds it; both are
 * banned in a billing path because a rate that renders as $2.50 while the
 * wallet charges 2_499_999 is a lie the operator cannot see. So the decimal
 * point is moved by slicing the digits: exact by construction.
 *
 * Trailing zeros are trimmed to at most two places, so $0.075 keeps its third
 * decimal while $2.50 does not grow four empty ones.
 */
export function microUsdToDecimalString(microUsd: number): string {
  const digits = String(Math.trunc(Math.abs(microUsd))).padStart(MICRO_USD_DECIMALS + 1, '0');
  const split = digits.length - MICRO_USD_DECIMALS;
  const whole = digits.slice(0, split);
  const fraction = digits
    .slice(split)
    .replace(/0+$/u, '')
    .padEnd(MODEL_COST_RATE_MIN_DECIMALS, '0');
  return `${whole}.${fraction}`;
}

/**
 * A per-million-tokens rate as the operator reads it. `null` in means the
 * modality has no rate at all — which is NOT zero, and must never render as
 * "$0.00", or an unpriced model would look free.
 */
export function formatMicroUsdPerMillionAsUsd(microUsd: number | null): string | null {
  if (microUsd === null || !Number.isFinite(microUsd) || microUsd < 0) {
    return null;
  }
  return `$${microUsdToDecimalString(microUsd)}`;
}

/** Prefills a rate field. Empty string, not "0", when the rate is unknown. */
export function microUsdToRateInput(microUsd: number | null): string {
  if (microUsd === null || !Number.isFinite(microUsd) || microUsd < 0) {
    return '';
  }
  return microUsdToDecimalString(microUsd);
}

/**
 * Dollars per million tokens, as typed, to the integer micro-USD the API
 * takes. Returns null for an empty field — "unset", which the backend stores
 * as a null rate rather than a free one.
 *
 * Parsed by string, not by `parseFloat(x) * 1_000_000`: 0.07 * 1e6 is
 * 70000.00000000001, and rounding that back is exactly the class of drift this
 * page exists to remove.
 */
export function dollarsPerMillionToMicroUsd(raw: string): number | null {
  const trimmed = raw.trim();
  if (trimmed === '') {
    return null;
  }
  const [wholePart = '0', fractionPart = ''] = trimmed.split('.');
  const fraction = fractionPart.padEnd(MICRO_USD_DECIMALS, '0').slice(0, MICRO_USD_DECIMALS);
  return Number(wholePart) * MICRO_USD_PER_USD + Number(fraction);
}

/**
 * True when the field is either empty (unset) or a rate the publish DTO would
 * accept. Checked here so a typo is caught next to the field instead of coming
 * back as a 400 with nothing attached to it.
 */
/**
 * A plain unsigned decimal: digits, optionally one dot and up to six more.
 *
 * Written as a scan rather than a regular expression. The pattern this replaced
 * was a quantified prefix followed by an optional group, which the ReDoS
 * analyzer rejects; a single pass over the characters is provably linear and
 * needs no exemption. Rejects a sign, an exponent, a thousands separator and a
 * bare dot — every one of which we would otherwise coerce into a silently wrong
 * rate.
 */
function hasPlainDecimalShape(value: string): boolean {
  const dot = value.indexOf('.');
  const whole = dot === -1 ? value : value.slice(0, dot);
  const fraction = dot === -1 ? '' : value.slice(dot + 1);

  if (whole.length === 0 || whole.length > MODEL_COST_RATE_MAX_INTEGER_DIGITS) {
    return false;
  }
  if (
    dot !== -1 &&
    (fraction.length === 0 || fraction.length > MODEL_COST_RATE_MAX_DECIMAL_PLACES)
  ) {
    return false;
  }
  // A second dot lands in `fraction`, so digit-only checks catch it too.
  return isDigitsOnly(whole) && (fraction === '' || isDigitsOnly(fraction));
}

function isDigitsOnly(value: string): boolean {
  for (const character of value) {
    if (character < '0' || character > '9') {
      return false;
    }
  }
  return true;
}

export function isValidRateInput(raw: string): boolean {
  const trimmed = raw.trim();
  if (trimmed === '') {
    return true;
  }
  if (!hasPlainDecimalShape(trimmed)) {
    return false;
  }
  const microUsd = dollarsPerMillionToMicroUsd(trimmed);
  return microUsd !== null && microUsd <= MODEL_COST_RATE_MAX_MICRO_USD;
}

/** Tallies rows per pricing source, so the banner counts once, not per render. */
export function countModelCostRowsBySource(
  rows: ReadonlyArray<ModelCostCatalogRow>,
): ModelCostSourceCounts {
  const counts: ModelCostSourceCounts = { ...MODEL_COST_EMPTY_SOURCE_COUNTS };
  for (const row of rows) {
    counts[row.pricingSource] += 1;
  }
  return counts;
}

/**
 * Orders the table so the work is the first thing on screen: fallbacks, then
 * unpriced, then everything already priced. Ties break on provider then model
 * so the order is stable across refetches — a row that jumps between renders
 * is a row an operator edits by mistake.
 */
export function sortModelCostRowsByAttention(
  rows: ReadonlyArray<ModelCostCatalogRow>,
): ModelCostCatalogRow[] {
  return [...rows].sort((left, right) => {
    const rankDelta =
      MODEL_PRICING_SOURCE_RANK[left.pricingSource] -
      MODEL_PRICING_SOURCE_RANK[right.pricingSource];
    if (rankDelta !== 0) {
      return rankDelta;
    }
    const providerDelta = left.provider.localeCompare(right.provider);
    return providerDelta === 0 ? left.modelKey.localeCompare(right.modelKey) : providerDelta;
  });
}

export function filterModelCostRows(
  rows: ReadonlyArray<ModelCostCatalogRow>,
  source: ModelPricingSource | ModelPricingSourceFilter,
  search: string,
): ModelCostCatalogRow[] {
  const needle = search.trim().toLowerCase();
  return rows.filter((row) => {
    if (source !== ModelPricingSourceFilter.ALL && row.pricingSource !== source) {
      return false;
    }
    if (needle === '') {
      return true;
    }
    return (
      row.provider.toLowerCase().includes(needle) ||
      row.modelKey.toLowerCase().includes(needle) ||
      (row.displayName ?? '').toLowerCase().includes(needle)
    );
  });
}
