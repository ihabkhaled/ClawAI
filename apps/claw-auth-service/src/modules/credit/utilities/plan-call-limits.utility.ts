import { PAYG_MIN_VIABLE_OUTPUT_TOKENS } from '@claw/shared-constants';
import type { ModelCostRates } from '@claw/shared-types';
import { clampOutputTokensToBalance } from '@claw/shared-utilities';

import type {
  PlanCallLimits,
  PlanCallOutcome,
  PlanCallRequest,
} from '../types/plan-call-limits.types';

/**
 * Applies a plan's per-call limits to one request, smallest limit wins.
 *
 * The output ceiling is clamped (a shorter answer beats no answer). A request is
 * refused only when no answer can fit: the prompt is longer than the plan accepts,
 * or the prompt alone (plus per-unit artifacts) costs more than the per-call cap.
 * The dollar cap reuses the same worst-case arithmetic as the credit wallet, so
 * the two can never disagree about what a request costs.
 *
 * `rates` is null for a model with no usable price. The dollar cap cannot be
 * computed then, so only the token limits apply; refusing unpriced models is a
 * separate decision.
 */
export function applyPlanCallLimits(
  limits: PlanCallLimits,
  request: PlanCallRequest,
  rates: ModelCostRates | null,
): PlanCallOutcome {
  if (limits.maxInputTokens !== null && request.promptTokens > limits.maxInputTokens) {
    return { status: 'REFUSED', reason: 'INPUT_TOO_LONG' };
  }
  const ceiling =
    limits.maxOutputTokens === null
      ? request.requestedMaxOutputTokens
      : Math.min(request.requestedMaxOutputTokens, limits.maxOutputTokens);
  if (ceiling <= 0) {
    return { status: 'REFUSED', reason: 'CALL_TOO_EXPENSIVE' };
  }
  if (limits.maxCostMicroUsd === null || rates === null) {
    return { status: 'WITHIN', maxOutputTokens: ceiling };
  }
  const clamp = clampOutputTokensToBalance({
    rates,
    balanceMicroUsd: limits.maxCostMicroUsd,
    promptTokens: request.promptTokens,
    cachedPromptTokens: request.cachedPromptTokens,
    cacheWritePromptTokens: request.cacheWritePromptTokens,
    requestedMaxOutputTokens: ceiling,
    minViableOutputTokens: PAYG_MIN_VIABLE_OUTPUT_TOKENS,
    imageUnits: request.imageUnits,
    audioSeconds: request.audioSeconds,
    ttsCharacters: request.ttsCharacters,
    videoSeconds: request.videoSeconds,
  });
  return clamp.status === 'AFFORDABLE'
    ? { status: 'WITHIN', maxOutputTokens: clamp.maxOutputTokens }
    : { status: 'REFUSED', reason: 'CALL_TOO_EXPENSIVE' };
}
