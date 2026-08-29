import { TOKENS_PER_PRICING_UNIT } from '@claw/shared-constants';
import type { ModelCostRates } from '@claw/shared-types';

import { MoneyError } from '../money/money-error';
import { MoneyErrorCode } from '../money/money-error-code.enum';
import type { AffordabilityInput, AffordabilityOutcome } from './affordability.types';

/**
 * Worst-case cost of the prompt half of a request, in integer micro-USD.
 *
 * Rounds UP for the same reason the rest of the cost math does: an
 * under-estimate here becomes an over-spend downstream, and one micro-USD of
 * over-estimate is invisible.
 *
 * A cached token falls back to the full input rate when the provider publishes
 * no cache rate — "we don't know" must never round down to free.
 */
export function estimateInputCostMicroUsd(
  promptTokens: number,
  cachedPromptTokens: number,
  rates: ModelCostRates,
): number {
  const inputRate = rates.inputPerMillionMicroUsd ?? 0;
  const cachedRate = rates.cachedInputPerMillionMicroUsd ?? rates.inputPerMillionMicroUsd ?? 0;
  const cached = Math.min(Math.max(0, cachedPromptTokens), Math.max(0, promptTokens));
  const fresh = Math.max(0, promptTokens) - cached;

  return (
    Math.ceil((fresh * inputRate) / TOKENS_PER_PRICING_UNIT) +
    Math.ceil((cached * cachedRate) / TOKENS_PER_PRICING_UNIT)
  );
}

/**
 * How many output tokens a remaining budget can pay for at the model's most
 * expensive output rate.
 *
 * Prices every output token at `max(outputRate, reasoningRate)` on purpose. The
 * split between answer tokens and reasoning tokens is not knowable before the
 * call, and a reasoning model's thinking rate can exceed its answer rate. Using
 * the cheaper of the two would let a thinking-heavy response outrun its budget —
 * which is exactly the overrun this whole function exists to make impossible.
 *
 * A model with a zero or missing output rate returns `Number.MAX_SAFE_INTEGER`:
 * there is nothing to divide by, so affordability is not the binding constraint.
 * The caller must still refuse an UNPRICED model — that is a separate check, and
 * conflating "free" with "unpriced" is how unbounded spend gets waved through.
 */
export function affordableOutputTokens(remainingMicroUsd: number, rates: ModelCostRates): number {
  const outputRate = Math.max(
    rates.outputPerMillionMicroUsd ?? 0,
    rates.reasoningPerMillionMicroUsd ?? 0,
  );
  if (outputRate <= 0) {
    return Number.MAX_SAFE_INTEGER;
  }
  if (remainingMicroUsd <= 0) {
    return 0;
  }
  return Math.floor((remainingMicroUsd * TOKENS_PER_PRICING_UNIT) / outputRate);
}

/**
 * Clamps a request's output ceiling to what the user's remaining credit can pay
 * for, so the provider is PHYSICALLY INCAPABLE of producing a response that
 * costs more than the balance.
 *
 * This is the load-bearing half of "a user can never exceed their credit". The
 * alternative — reserve the worst case and reconcile afterwards — does not work
 * here: the default `maxOutputTokens` in this platform is 30,512, which at a
 * $10/M output rate is a $0.31 hold, more than a Starter plan's entire daily
 * allowance. Reserving that would refuse the user's FIRST request of the day
 * while their wallet was full. Clamping instead hands back a shorter answer,
 * which is a far better failure than no answer at all.
 *
 * The returned `worstCaseCostMicroUsd` is what the caller reserves. It is
 * guaranteed ≤ `balanceMicroUsd`, so the reservation can never be rejected for
 * insufficient funds by the very balance it was computed from.
 */
export function clampOutputTokensToBalance(input: AffordabilityInput): AffordabilityOutcome {
  if (!Number.isFinite(input.balanceMicroUsd) || input.balanceMicroUsd < 0) {
    throw new MoneyError(MoneyErrorCode.NEGATIVE_AMOUNT, 'balanceMicroUsd must be non-negative');
  }

  // Per-unit artifacts are charged whether or not a single token is produced,
  // so they join the prompt on the fixed side of the ledger.
  const fixedCostMicroUsd =
    estimateInputCostMicroUsd(input.promptTokens, input.cachedPromptTokens, input.rates) +
    Math.max(0, input.imageUnits ?? 0) * Math.max(0, input.rates.imagePerUnitMicroUsd ?? 0);
  if (fixedCostMicroUsd > input.balanceMicroUsd) {
    return { status: 'PROMPT_UNAFFORDABLE', promptCostMicroUsd: fixedCostMicroUsd };
  }

  const remaining = input.balanceMicroUsd - fixedCostMicroUsd;
  const affordable = affordableOutputTokens(remaining, input.rates);
  if (affordable < input.minViableOutputTokens) {
    return { status: 'OUTPUT_UNAFFORDABLE', affordableOutputTokens: affordable };
  }

  const maxOutputTokens = Math.min(input.requestedMaxOutputTokens, affordable);
  const outputRate = Math.max(
    input.rates.outputPerMillionMicroUsd ?? 0,
    input.rates.reasoningPerMillionMicroUsd ?? 0,
  );

  return {
    status: 'AFFORDABLE',
    maxOutputTokens,
    clamped: maxOutputTokens < input.requestedMaxOutputTokens,
    worstCaseCostMicroUsd:
      fixedCostMicroUsd + Math.ceil((maxOutputTokens * outputRate) / TOKENS_PER_PRICING_UNIT),
  };
}
