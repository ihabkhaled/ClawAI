import { CANCELLED_STREAM_CHARS_PER_TOKEN } from '../constants/cancelled-stream-usage.constants';
import type { CancelledStreamUsage } from '../types/cancelled-stream-usage.types';
import { estimateTokensFromText } from './token-estimator.utility';

/**
 * What a call the caller cut short is billed on (ADR-175 addendum 2026-10-14).
 *
 * The provider generated every character it already sent, and a cancel ends the
 * stream before the usage frame. Releasing the whole hold would let a caller
 * dodge paying by cancelling mid-call, so the streamed characters are turned
 * into an output-token estimate and the prompt is estimated from its text. The
 * output estimate never exceeds the hold's ceiling, so the settlement cannot
 * charge more than was reserved.
 */
export function estimateCancelledStreamUsage(args: {
  streamedChars: number;
  promptText: string;
  outputCeilingTokens: number;
}): CancelledStreamUsage {
  const streamed = Math.max(0, Math.floor(args.streamedChars));
  const completionTokens = Math.min(
    Math.ceil(streamed / CANCELLED_STREAM_CHARS_PER_TOKEN),
    args.outputCeilingTokens,
  );
  return {
    promptTokens: estimateTokensFromText(args.promptText),
    completionTokens: Math.max(0, completionTokens),
  };
}
