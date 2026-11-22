import {
  ENHANCE_CHARS_PER_TOKEN,
  ENHANCE_MAX_OUTPUT_TOKENS,
  MICRO_PER_MILLION,
} from '../constants/enhance.constants';
import type { ModelRates } from '../types/enhance.types';

/** Upper-bound cost in micro-USD of one enhancement call; null when the model has no token price. */
export function estimateMicroUsd(rates: ModelRates, promptChars: number): number | null {
  if (rates.inputPerMillionMicroUsd === null || rates.outputPerMillionMicroUsd === null) {
    return null;
  }
  const inputTokens = Math.ceil(promptChars / ENHANCE_CHARS_PER_TOKEN);
  return Math.ceil(
    (inputTokens * rates.inputPerMillionMicroUsd +
      ENHANCE_MAX_OUTPUT_TOKENS * rates.outputPerMillionMicroUsd) /
      MICRO_PER_MILLION,
  );
}
