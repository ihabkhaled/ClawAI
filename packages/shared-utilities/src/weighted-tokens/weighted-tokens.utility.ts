import { TOKENS_PER_PRICING_UNIT, WEIGHTED_TOKENS_PER_USD } from '@claw/shared-constants';
import type { ModelCostRates, RawTokenBreakdown } from '@claw/shared-types';

import { MoneyError } from '../money/money-error';
import { MoneyErrorCode } from '../money/money-error-code.enum';
import { roundHalfUpDivide } from '../money/money.utility';
import type { BillableUnitCounts } from './weighted-tokens.types';

// Cost of one modality: (quantity * ratePerMillion) / 1_000_000, rounded up.
//
// Rounding UP is deliberate. Under-charging a quota is a budget leak that
// compounds across millions of requests; over-charging by at most one micro-USD
// is invisible. A null rate contributes nothing and is reported separately as
// reduced confidence rather than silently treated as free.
function costForUnits(units: number, ratePerMillionMicroUsd: number | null): number {
  if (ratePerMillionMicroUsd === null || units <= 0) {
    return 0;
  }
  if (!Number.isInteger(units) || units < 0) {
    throw new MoneyError(
      MoneyErrorCode.NON_INTEGER_AMOUNT,
      'token counts must be non-negative integers',
    );
  }
  const product = units * ratePerMillionMicroUsd;
  if (!Number.isSafeInteger(product)) {
    throw new MoneyError(
      MoneyErrorCode.AMOUNT_OVERFLOW,
      'token cost exceeds the safe integer range',
    );
  }
  return Math.ceil(product / TOKENS_PER_PRICING_UNIT);
}

// Per-unit (not per-million) pricing: tool and search calls, images, seconds of
// input audio, characters of synthesised speech.
//
// BigInt on purpose. A per-unit product needs no rounding at all — an integer
// count times an integer micro-USD rate is already exact — so the only way it
// can go wrong is overflow, and BigInt makes that a checked comparison at the
// end instead of a silent float.
function costForCalls(calls: number, ratePerUnitMicroUsd: number | null): bigint {
  if (ratePerUnitMicroUsd === null || calls <= 0) {
    return 0n;
  }
  if (!Number.isInteger(calls) || !Number.isInteger(ratePerUnitMicroUsd)) {
    throw new MoneyError(
      MoneyErrorCode.NON_INTEGER_AMOUNT,
      'per-unit counts and rates must be non-negative integers',
    );
  }
  return ratePerUnitMicroUsd <= 0 ? 0n : BigInt(calls) * BigInt(ratePerUnitMicroUsd);
}

// The one boundary back to `number`. Every caller of the calculator stores or
// compares a JS number, so the exact BigInt total is checked, not truncated.
function toSafeMicroUsd(total: bigint, what: string): number {
  if (total > BigInt(Number.MAX_SAFE_INTEGER)) {
    throw new MoneyError(MoneyErrorCode.AMOUNT_OVERFLOW, `${what} exceeds the safe integer range`);
  }
  return Number(total);
}

/**
 * Cost of the non-token quantities alone, in integer micro-USD.
 *
 * Separate from {@link calculateCostMicroUsd} because the reservation needs it
 * on its own: a per-unit artifact is charged whether or not a single token is
 * produced, so its cost is FIXED before the call and joins the prompt on the
 * fixed side of the affordability clamp.
 *
 * `audioPerUnitMicroUsd` is a per-SECOND rate; `ttsPerCharacterMicroUsd` a
 * per-character one. Summed exactly in BigInt — no rounding step exists here.
 */
export function calculateUnitCostMicroUsd(
  units: BillableUnitCounts,
  rates: ModelCostRates,
): number {
  return toSafeMicroUsd(unitCostMicroUsd(units, rates), 'per-unit cost');
}

function unitCostMicroUsd(units: BillableUnitCounts, rates: ModelCostRates): bigint {
  return (
    costForCalls(units.imageUnits ?? 0, rates.imagePerUnitMicroUsd) +
    costForCalls(units.audioSeconds ?? 0, rates.audioPerUnitMicroUsd) +
    costForCalls(units.ttsCharacters ?? 0, rates.ttsPerCharacterMicroUsd)
  );
}

// Total estimated provider cost of one execution, in integer micro-USD.
//
// Cached input is billed at its own (cheaper) rate when the provider publishes
// one; otherwise it falls back to the standard input rate, because "we don't
// know" must never round down to free on a limited plan.
//
// Token modalities are rounded UP once each (their rates are per MILLION);
// per-unit quantities are exact products. The sum is accumulated in BigInt and
// converted back to a number once, at the end.
export function calculateCostMicroUsd(raw: RawTokenBreakdown, rates: ModelCostRates): number {
  const cachedRate = rates.cachedInputPerMillionMicroUsd ?? rates.inputPerMillionMicroUsd;
  const reasoningRate = rates.reasoningPerMillionMicroUsd ?? rates.outputPerMillionMicroUsd;

  const tokens =
    BigInt(costForUnits(raw.inputTokens, rates.inputPerMillionMicroUsd)) +
    BigInt(costForUnits(raw.cachedInputTokens, cachedRate)) +
    BigInt(costForUnits(raw.reasoningTokens, reasoningRate)) +
    BigInt(costForUnits(raw.outputTokens, rates.outputPerMillionMicroUsd));
  const calls =
    costForCalls(raw.toolCalls, rates.toolCallPerUnitMicroUsd) +
    costForCalls(raw.searchCalls, rates.searchCallPerUnitMicroUsd);

  return toSafeMicroUsd(tokens + calls + unitCostMicroUsd(raw, rates), 'execution cost');
}

// The normalization identity: 1_000_000 weighted tokens === $1.00 of provider
// cost, and 1 micro-USD === 1 weighted token, so this is `ceil(costMicroUsd)`.
// It is written as an explicit ratio anyway so changing the baseline in
// shared-constants stays a one-line change rather than a hunt for a hidden 1:1.
export function costMicroUsdToWeightedTokens(costMicroUsd: number): number {
  if (!Number.isFinite(costMicroUsd) || costMicroUsd < 0) {
    throw new MoneyError(MoneyErrorCode.NEGATIVE_AMOUNT, 'costMicroUsd must be non-negative');
  }
  const product = Math.ceil(costMicroUsd) * WEIGHTED_TOKENS_PER_USD;
  if (!Number.isSafeInteger(product)) {
    throw new MoneyError(
      MoneyErrorCode.AMOUNT_OVERFLOW,
      'weighted-token conversion exceeds the safe integer range',
    );
  }
  return roundHalfUpDivide(product, WEIGHTED_TOKENS_PER_USD);
}

export function calculateWeightedTokens(raw: RawTokenBreakdown, rates: ModelCostRates): number {
  return costMicroUsdToWeightedTokens(calculateCostMicroUsd(raw, rates));
}

// Pre-flight estimate. `maxOutputTokens` is the ceiling the request could
// produce, not a guess at the likely value: the reservation must cover the worst
// case or the budget is not actually enforced.
export function estimateWeightedTokens(
  promptTokens: number,
  maxOutputTokens: number,
  rates: ModelCostRates,
): number {
  return calculateWeightedTokens(
    {
      inputTokens: promptTokens,
      cachedInputTokens: 0,
      reasoningTokens: 0,
      outputTokens: maxOutputTokens,
      toolCalls: 0,
      searchCalls: 0,
      imageUnits: 0,
    },
    rates,
  );
}

// True when the registry has no usable price for a model. Callers must treat
// this as UNSAFE for limited plans unless an administrator explicitly allows it
// — an unpriced model is an unbounded liability, not a free one.
export function hasUsablePricing(rates: ModelCostRates): boolean {
  return isTokenPriced(rates) || isPerUnitPriced(rates);
}

/** A conversational model: priced by tokens in and tokens out. */
export function isTokenPriced(rates: ModelCostRates): boolean {
  return rates.inputPerMillionMicroUsd !== null && rates.outputPerMillionMicroUsd !== null;
}

/**
 * A model priced per artifact rather than per token — per image, per second of
 * transcribed audio, or per character of synthesised speech.
 *
 * An image endpoint publishes a flat rate per image and returns no token usage,
 * so requiring token rates would classify a correctly-priced DALL-E row as
 * UNPRICED and refuse it — while a row that happened to carry token rates would
 * be charged $0 for the image itself. Both failures came from one missing
 * branch.
 */
export function isPerUnitPriced(rates: ModelCostRates): boolean {
  return [
    rates.imagePerUnitMicroUsd,
    rates.audioPerUnitMicroUsd,
    rates.ttsPerCharacterMicroUsd,
  ].some((rate) => rate !== null && rate > 0);
}
