import { ESTIMATED_COST_PER_INPUT_TOKEN, ESTIMATED_COST_PER_OUTPUT_TOKEN } from '@/constants';

/**
 * Estimate the cost of a message based on provider and token counts.
 * Returns a formatted string like "$0.0045" or null if cost cannot be estimated.
 */
export function estimateCost(
  provider: string | null,
  inputTokens: number | null,
  outputTokens: number | null,
): string | null {
  if (provider === null || (inputTokens === null && outputTokens === null)) {
    return null;
  }

  const normalizedProvider = provider.toLowerCase();
  const inputRate = ESTIMATED_COST_PER_INPUT_TOKEN[normalizedProvider];
  const outputRate = ESTIMATED_COST_PER_OUTPUT_TOKEN[normalizedProvider];

  if (inputRate === undefined || outputRate === undefined) {
    return null;
  }

  const cost = (inputTokens ?? 0) * inputRate + (outputTokens ?? 0) * outputRate;

  if (cost === 0) {
    return '$0.00';
  }

  if (cost < 0.01) {
    return `$${cost.toFixed(4)}`;
  }

  return `$${cost.toFixed(2)}`;
}
