import { type ModelCostRates, TokenUsageSource } from '@claw/shared-types';
import {
  calculateCostMicroUsd,
  calculateUnitCostMicroUsd,
  toRawTokenBreakdown,
} from '@claw/shared-utilities';
import { LOCAL_TRANSCRIPTION_PROVIDER } from '../constants/transcription.constants';
import { type ChunkCostInput } from '../types/transcribe-chunk.types';
import {
  estimateGeminiPromptTokens,
  holdAudioSeconds,
  isPerSecondPricedProvider,
  measuredAudioSeconds,
  measuredTokenUsage,
} from './transcription-payg.utility';

/**
 * ADR-221 — what one platform-paid chunk cost, in integer micro-USD, priced
 * EXACTLY as the PAYG meter would have settled it (rule 37 item 17): OpenAI per
 * measured second of audio, Gemini on reported tokens (or the reserved prompt
 * estimate plus a character-derived completion when usage is absent). LOCAL is
 * free compute: 0. A null rate card (unreachable or unpriced) also returns 0 —
 * the caller reports that as `costKnown: false`, never as a measurement.
 */
export function estimateChunkCostMicroUsd(
  input: ChunkCostInput,
  rates: ModelCostRates | null,
): number {
  if (input.provider === LOCAL_TRANSCRIPTION_PROVIDER || rates === null) {
    return 0;
  }
  const heldSeconds = holdAudioSeconds(input.sizeBytes, input.measuredSeconds);
  if (isPerSecondPricedProvider(input.provider)) {
    const audioSeconds = measuredAudioSeconds(input.result.durationSeconds, heldSeconds);
    return calculateUnitCostMicroUsd({ audioSeconds }, rates);
  }
  const usage = measuredTokenUsage(input.result, estimateGeminiPromptTokens(heldSeconds));
  const reported = input.result.usage !== undefined;
  return calculateCostMicroUsd(
    toRawTokenBreakdown({
      ...usage,
      totalTokens: usage.promptTokens + usage.completionTokens,
      estimated: !reported,
      source: reported ? TokenUsageSource.NATIVE : TokenUsageSource.ESTIMATED,
    }),
    rates,
  );
}
