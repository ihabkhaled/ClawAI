import { TokenEstimatorKind, type TokenUsage, TokenUsageSource } from '@claw/shared-types';

import { estimateTextTokens } from './estimate-text-tokens.utility';
import { toTokenCount } from './token-usage-guards.utility';
import type { NormalizeTokenUsageInput, ResolvedTokenSide } from './token-usage.types';

/**
 * Resolves a single side (prompt or completion): prefers the native count when
 * present and finite, otherwise estimates from the supplied text. Always
 * returns a safe, non-negative integer and whether it was estimated.
 */
function resolveSide(nativeCount: number | undefined, text: string | undefined): ResolvedTokenSide {
  const safeNative = toTokenCount(nativeCount);
  if (safeNative !== undefined) {
    return { tokens: safeNative, estimated: false };
  }
  return { tokens: estimateTextTokens(text), estimated: true };
}

/**
 * Picks the {@link TokenUsageSource} from the two sides' estimated flags:
 * both native → NATIVE, both estimated → ESTIMATED, otherwise MIXED.
 */
function resolveSource(promptEstimated: boolean, completionEstimated: boolean): TokenUsageSource {
  if (!promptEstimated && !completionEstimated) {
    return TokenUsageSource.NATIVE;
  }
  if (promptEstimated && completionEstimated) {
    return TokenUsageSource.ESTIMATED;
  }
  return TokenUsageSource.MIXED;
}

/**
 * Builds a complete {@link TokenUsage} from partial native counts plus optional
 * fallback text. This is the universal normalizer every per-provider extractor
 * delegates to so EVERY model call yields a TokenUsage.
 *
 * Rules:
 * - Both native counts present → `source = NATIVE`, `estimated = false`,
 *   `estimator = NONE`.
 * - Both counts missing → estimate each from text → `source = ESTIMATED`,
 *   `estimated = true`, `estimator = CHAR_DIV_4`.
 * - Exactly one missing → `source = MIXED`, `estimated = true`,
 *   `estimator = CHAR_DIV_4`.
 *
 * `totalTokens` is always `promptTokens + completionTokens` (a provided
 * `totalTokens` is ignored to keep the invariant). Never throws; always returns
 * safe non-negative integers.
 */
/**
 * Clamps a reported sub-count to the side it is a subset of.
 *
 * `cachedPromptTokens` and `reasoningTokens` are always PARTS of the prompt and
 * completion respectively. A provider that reports a part larger than the whole
 * is malformed, and letting that through would make the cheap-rate share exceed
 * the total and under-charge the request. Clamping is the fail-safe direction:
 * the excess falls back to the full-price side.
 *
 * An estimated side has no measured sub-count, so the part is zero there.
 */
function resolveSubCount(reported: number | undefined, whole: ResolvedTokenSide): number {
  if (whole.estimated) {
    return 0;
  }
  const safe = toTokenCount(reported);
  if (safe === undefined) {
    return 0;
  }
  return Math.min(safe, whole.tokens);
}

export function normalizeTokenUsage(input: NormalizeTokenUsageInput): TokenUsage {
  const prompt = resolveSide(input.promptTokens, input.promptText);
  const completion = resolveSide(input.completionTokens, input.completionText);

  const source = resolveSource(prompt.estimated, completion.estimated);
  const estimated = prompt.estimated || completion.estimated;

  return {
    promptTokens: prompt.tokens,
    completionTokens: completion.tokens,
    totalTokens: prompt.tokens + completion.tokens,
    cachedPromptTokens: resolveSubCount(input.cachedPromptTokens, prompt),
    reasoningTokens: resolveSubCount(input.reasoningTokens, completion),
    estimated,
    source,
    estimator: estimated ? TokenEstimatorKind.CHAR_DIV_4 : TokenEstimatorKind.NONE,
  };
}
