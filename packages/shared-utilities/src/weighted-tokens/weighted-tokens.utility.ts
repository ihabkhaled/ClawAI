import { TOKENS_PER_PRICING_UNIT, WEIGHTED_TOKENS_PER_USD } from '@claw/shared-constants';
import type { ModelCostRates, RawTokenBreakdown } from '@claw/shared-types';

import { MoneyError } from '../money/money-error';
import { MoneyErrorCode } from '../money/money-error-code.enum';
import { roundHalfUpDivide } from '../money/money.utility';

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

// Per-unit (not per-million) pricing, used for tool and search calls.
function costForCalls(calls: number, ratePerUnitMicroUsd: number | null): number {
  if (ratePerUnitMicroUsd === null || calls <= 0) {
    return 0;
  }
  if (!Number.isInteger(calls) || calls < 0) {
    throw new MoneyError(
      MoneyErrorCode.NON_INTEGER_AMOUNT,
      'call counts must be non-negative integers',
    );
  }
  const product = calls * ratePerUnitMicroUsd;
  if (!Number.isSafeInteger(product)) {
    throw new MoneyError(
      MoneyErrorCode.AMOUNT_OVERFLOW,
      'call cost exceeds the safe integer range',
    );
  }
  return product;
}

// Total estimated provider cost of one execution, in integer micro-USD.
//
// Cached input is billed at its own (cheaper) rate when the provider publishes
// one; otherwise it falls back to the standard input rate, because "we don't
// know" must never round down to free on a limited plan.
export function calculateCostMicroUsd(raw: RawTokenBreakdown, rates: ModelCostRates): number {
  const cachedRate = rates.cachedInputPerMillionMicroUsd ?? rates.inputPerMillionMicroUsd;
  const reasoningRate = rates.reasoningPerMillionMicroUsd ?? rates.outputPerMillionMicroUsd;

  return (
    costForUnits(raw.inputTokens, rates.inputPerMillionMicroUsd) +
    costForUnits(raw.cachedInputTokens, cachedRate) +
    costForUnits(raw.reasoningTokens, reasoningRate) +
    costForUnits(raw.outputTokens, rates.outputPerMillionMicroUsd) +
    costForCalls(raw.toolCalls, rates.toolCallPerUnitMicroUsd) +
    costForCalls(raw.searchCalls, rates.searchCallPerUnitMicroUsd)
  );
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
    },
    rates,
  );
}

// True when the registry has no usable price for a model. Callers must treat
// this as UNSAFE for limited plans unless an administrator explicitly allows it
// — an unpriced model is an unbounded liability, not a free one.
export function hasUsablePricing(rates: ModelCostRates): boolean {
  return rates.inputPerMillionMicroUsd !== null && rates.outputPerMillionMicroUsd !== null;
}
