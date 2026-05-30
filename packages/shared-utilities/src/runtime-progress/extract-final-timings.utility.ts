import { RuntimeProgressConfidence, type RuntimeProgressMetrics } from '@claw/shared-types';

/**
 * Subset of the Ollama final-frame fields we care about for timing. All
 * durations are expressed in nanoseconds as they arrive on the wire.
 */
export type OllamaFinalTimingsInput = {
  totalDurationNs?: number;
  loadDurationNs?: number;
  promptEvalCount?: number;
  promptEvalDurationNs?: number;
  evalCount?: number;
  evalDurationNs?: number;
};

const NS_PER_MS = 1_000_000;
const NS_PER_S = 1_000_000_000;

function nsToMs(ns: number | undefined): number | undefined {
  if (ns === undefined || !Number.isFinite(ns) || ns < 0) {
    return undefined;
  }
  return ns / NS_PER_MS;
}

/**
 * Convert the nanosecond-precision timing fields emitted on the final
 * Ollama NDJSON frame into a partial {@link RuntimeProgressMetrics} object
 * that can be spread into a full metrics record by the caller.
 *
 * - All durations are converted from nanoseconds to milliseconds.
 * - `tokensPerSecond` is derived from `evalCount / (evalDurationNs / 1e9)`
 *   and guarded against division by zero (returns `undefined` instead of
 *   `Infinity` when the model emits 0-duration generation, e.g. on a
 *   cached completion or a zero-eval response).
 * - `progressConfidence` is set to `RUNTIME_REPORTED` because the
 *   measurements are reported directly by the runtime rather than
 *   estimated client-side.
 */
export function extractOllamaFinalTimings(
  input: OllamaFinalTimingsInput,
): Partial<RuntimeProgressMetrics> {
  const result: Partial<RuntimeProgressMetrics> = {
    progressConfidence: RuntimeProgressConfidence.RUNTIME_REPORTED,
  };

  const elapsedMs = nsToMs(input.totalDurationNs);
  if (elapsedMs !== undefined) {
    result.elapsedMs = elapsedMs;
  }

  const modelLoadMs = nsToMs(input.loadDurationNs);
  if (modelLoadMs !== undefined) {
    result.modelLoadMs = modelLoadMs;
  }

  const promptEvalMs = nsToMs(input.promptEvalDurationNs);
  if (promptEvalMs !== undefined) {
    result.promptEvalMs = promptEvalMs;
  }

  const generationMs = nsToMs(input.evalDurationNs);
  if (generationMs !== undefined) {
    result.generationMs = generationMs;
  }

  if (
    typeof input.promptEvalCount === 'number' &&
    Number.isFinite(input.promptEvalCount) &&
    input.promptEvalCount >= 0
  ) {
    result.promptTokens = input.promptEvalCount;
  }

  if (
    typeof input.evalCount === 'number' &&
    Number.isFinite(input.evalCount) &&
    input.evalCount >= 0
  ) {
    result.outputTokens = input.evalCount;
  }

  if (result.promptTokens !== undefined || result.outputTokens !== undefined) {
    result.totalTokens = (result.promptTokens ?? 0) + (result.outputTokens ?? 0);
  }

  if (
    input.evalCount !== undefined &&
    input.evalDurationNs !== undefined &&
    Number.isFinite(input.evalCount) &&
    Number.isFinite(input.evalDurationNs) &&
    input.evalDurationNs > 0
  ) {
    result.tokensPerSecond = input.evalCount / (input.evalDurationNs / NS_PER_S);
  }

  return result;
}
