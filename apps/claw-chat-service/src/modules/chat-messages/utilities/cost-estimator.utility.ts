import { LOCAL_FREE_PROVIDERS, MODEL_PRICING } from '../constants/ai-model-pricing.constants';
import { type CostEstimate } from '../types/pricing.types';

// Estimates USD cost for a generation. Local providers are free ($0,
// available). Cloud models are matched by the longest pricing-key substring;
// unknown models return { available: false } so the UI shows "cost
// unavailable" rather than a misleading $0.
export function estimateCostUsd(
  provider: string,
  model: string,
  inputTokens: number,
  outputTokens: number,
): CostEstimate {
  if (LOCAL_FREE_PROVIDERS.includes(provider.toLowerCase() as (typeof LOCAL_FREE_PROVIDERS)[number])) {
    return { costUsd: 0, available: true };
  }

  const entry = findPricing(model);
  if (entry === null) {
    return { available: false };
  }

  const costUsd =
    (inputTokens / 1_000_000) * entry.inputPerMillion +
    (outputTokens / 1_000_000) * entry.outputPerMillion;
  return { costUsd, available: true };
}

function findPricing(model: string): { inputPerMillion: number; outputPerMillion: number } | null {
  const normalized = model.toLowerCase();
  let bestKey = '';
  for (const key of Object.keys(MODEL_PRICING)) {
    if (normalized.includes(key) && key.length > bestKey.length) {
      bestKey = key;
    }
  }
  if (bestKey === '') {
    return null;
  }
  const entry = MODEL_PRICING[bestKey];
  return entry ?? null;
}
