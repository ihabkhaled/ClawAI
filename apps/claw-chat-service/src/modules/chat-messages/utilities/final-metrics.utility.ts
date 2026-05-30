import { extractOllamaFinalTimings } from '@claw/shared-utilities';

import { type ProviderStreamFinalTimings } from '../types/provider-stream.types';
import { type FinalStreamMetricsPatch, type StreamBottleneck } from '../types/stream.types';

// Compares (modelLoad, promptEval, generation) and picks the slowest.
// `percentOfTotal` is the stage's share of the sum of the three, expressed
// as a fraction in [0, 1] so the FE can render either a percent badge
// (multiply by 100) or a normalized progress bar (use as-is). Returns
// `undefined` when none of the three stages have a positive duration —
// happens for cached responses or providers that report zero durations.
function computeBottleneck(
  modelLoadMs: number | undefined,
  promptEvalMs: number | undefined,
  generationMs: number | undefined,
): StreamBottleneck | undefined {
  const stages: { stage: StreamBottleneck['stage']; durationMs: number }[] = [];
  if (typeof modelLoadMs === 'number' && Number.isFinite(modelLoadMs) && modelLoadMs >= 0) {
    stages.push({ stage: 'modelLoad', durationMs: modelLoadMs });
  }
  if (typeof promptEvalMs === 'number' && Number.isFinite(promptEvalMs) && promptEvalMs >= 0) {
    stages.push({ stage: 'promptEval', durationMs: promptEvalMs });
  }
  if (typeof generationMs === 'number' && Number.isFinite(generationMs) && generationMs >= 0) {
    stages.push({ stage: 'generation', durationMs: generationMs });
  }
  if (stages.length === 0) {
    return undefined;
  }
  const total = stages.reduce((sum, s) => sum + s.durationMs, 0);
  if (total <= 0) {
    return undefined;
  }
  let slowest = stages[0];
  if (slowest === undefined) {
    return undefined;
  }
  for (let i = 1; i < stages.length; i += 1) {
    const current = stages[i];
    if (current !== undefined && current.durationMs > slowest.durationMs) {
      slowest = current;
    }
  }
  return {
    stage: slowest.stage,
    durationMs: slowest.durationMs,
    percentOfTotal: slowest.durationMs / total,
  };
}

// Converts the terminal Ollama timing fields (nanoseconds + counts) into a
// StreamMetrics-compatible patch enriched with the bottleneck breakdown.
// Callers spread the result into a base StreamMetrics so the live tracker's
// progressPercent/confidence/etc. survive unchanged.
//
// `totalMs` mirrors `elapsedMs` derived from `total_duration` — kept as a
// distinct field so the FE can label it "Total (runtime-reported)" vs the
// wall-clock elapsed from the tracker (which includes pre-connection setup).
export function computeFinalStreamMetrics(
  finalTimings: ProviderStreamFinalTimings,
): FinalStreamMetricsPatch {
  const partial = extractOllamaFinalTimings({
    totalDurationNs: finalTimings.totalDurationNs,
    loadDurationNs: finalTimings.loadDurationNs,
    promptEvalCount: finalTimings.promptEvalCount,
    promptEvalDurationNs: finalTimings.promptEvalDurationNs,
    evalCount: finalTimings.evalCount,
    evalDurationNs: finalTimings.evalDurationNs,
  });

  const bottleneck = computeBottleneck(
    partial.modelLoadMs,
    partial.promptEvalMs,
    partial.generationMs,
  );

  const result: FinalStreamMetricsPatch = {};
  if (partial.modelLoadMs !== undefined) {
    result.modelLoadMs = partial.modelLoadMs;
  }
  if (partial.promptEvalMs !== undefined) {
    result.promptEvalMs = partial.promptEvalMs;
  }
  if (partial.generationMs !== undefined) {
    result.generationMs = partial.generationMs;
  }
  if (partial.elapsedMs !== undefined) {
    result.totalMs = partial.elapsedMs;
  }
  if (partial.tokensPerSecond !== undefined) {
    result.tokensPerSecond = partial.tokensPerSecond;
  }
  if (partial.promptTokens !== undefined) {
    result.promptTokens = partial.promptTokens;
  }
  if (partial.outputTokens !== undefined) {
    result.outputTokens = partial.outputTokens;
  }
  if (partial.totalTokens !== undefined) {
    result.totalTokens = partial.totalTokens;
  }
  if (bottleneck !== undefined) {
    result.bottleneck = bottleneck;
  }
  return result;
}
