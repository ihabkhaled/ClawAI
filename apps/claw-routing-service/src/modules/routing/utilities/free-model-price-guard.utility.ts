import type { FreeModelPriceGuardResult } from '../types/model-output-price.types';
import type { RoutingDecisionResult } from '../types/routing.types';

/** True when a model's OUTPUT price (micro-USD per million tokens) is above the plan's limit. */
export function isOutputPriceAboveCap(
  outputPerMillionMicroUsd: number | null | undefined,
  capMicroUsd: number | null | undefined,
): boolean {
  return (
    typeof capMicroUsd === 'number' &&
    typeof outputPerMillionMicroUsd === 'number' &&
    outputPerMillionMicroUsd > capMicroUsd
  );
}

/** True for a plain chat model: priced per token only, with no per-image, audio, video or voice price. */
export function hasOnlyTokenPrices(snapshot: {
  imagePerUnitMicroUsd: number | null;
  audioPerUnitMicroUsd: number | null;
  videoPerUnitMicroUsd: number | null;
  ttsPerCharacterMicroUsd: number | null;
}): boolean {
  return (
    snapshot.imagePerUnitMicroUsd === null &&
    snapshot.audioPerUnitMicroUsd === null &&
    snapshot.videoPerUnitMicroUsd === null &&
    snapshot.ttsPerCharacterMicroUsd === null
  );
}

/**
 * Keeps an AUTO decision on models the plan's free requests cover (ADR-162).
 *
 * A model above the price limit is dropped from the fallback chain; if the pick itself is too
 * dear, the first cheaper fallback takes its place. When nothing cheaper exists the decision is
 * returned unchanged: auth-service refuses the dear model with a clear code and chat-service falls
 * back to an included model, so a user is never left without an answer by this guard.
 */
export function applyFreeModelPriceGuard(
  decision: RoutingDecisionResult,
  isAboveCap: (provider: string, model: string) => boolean,
): FreeModelPriceGuardResult {
  const chain = decision.fallbackChain ?? [];
  const affordableChain = chain.filter((entry) => !isAboveCap(entry.provider, entry.model));
  const excludedFallbacks = chain.length - affordableChain.length;

  if (!isAboveCap(decision.selectedProvider, decision.selectedModel)) {
    return {
      decision:
        excludedFallbacks === 0 ? decision : { ...decision, fallbackChain: affordableChain },
      excludedCandidates: excludedFallbacks,
      promoted: false,
    };
  }

  const [promoted, ...rest] = affordableChain;
  if (promoted === undefined) {
    return { decision, excludedCandidates: 1 + excludedFallbacks, promoted: false };
  }
  return {
    decision: {
      ...decision,
      selectedProvider: promoted.provider,
      selectedModel: promoted.model,
      fallbackChain: rest,
    },
    excludedCandidates: 1 + excludedFallbacks,
    promoted: true,
  };
}
