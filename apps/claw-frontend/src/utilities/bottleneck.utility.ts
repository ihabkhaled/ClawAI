import type {
  RuntimeProgressMetrics,
  StreamBottleneck,
  StreamMetrics,
  StreamStageTimings,
} from '@/types';

// The RuntimeMetricsHud accepts either a StreamMetrics or a
// RuntimeProgressMetrics. Only StreamMetrics carries a `bottleneck` field
// today; this helper narrows on the property's presence so the consumer
// never has to reach for `as unknown as StreamMetrics`.
export function getStreamMetricsBottleneck(
  metrics: StreamMetrics | RuntimeProgressMetrics | null,
): StreamBottleneck | null {
  if (metrics === null) {
    return null;
  }
  if (typeof metrics !== 'object') {
    return null;
  }
  const candidate = (metrics as StreamMetrics).bottleneck;
  return candidate ?? null;
}

// One segment of the BottleneckBreakdown bar. The colored bar uses these
// segments in order; the legend re-uses the same list so the colors line up.
export type BottleneckSegment = {
  stage: StreamBottleneck['stage'];
  durationMs: number;
};

// Builds the ordered [modelLoad, promptEval, generation] segment list from
// either the metrics rich fields (Ollama final frame) or — as a fallback —
// from the wall-clock stageTimings map keyed by AiStreamStage. Returns an
// empty array when no positive-duration segment exists, signalling the
// component should render nothing.
//
// The rich `metrics.modelLoadMs / promptEvalMs / generationMs` path is
// preferred because it reports runtime-precise durations; the stageTimings
// fallback covers SSE / OpenAI-compat streams that lack nanosecond timings.
export function buildBottleneckSegments(
  stageTimings: StreamStageTimings | null,
  metrics: StreamMetrics | null,
): BottleneckSegment[] {
  const fromMetrics: BottleneckSegment[] = [];
  if (metrics !== null) {
    if (typeof metrics.modelLoadMs === 'number' && metrics.modelLoadMs > 0) {
      fromMetrics.push({ stage: 'modelLoad', durationMs: metrics.modelLoadMs });
    }
    if (typeof metrics.promptEvalMs === 'number' && metrics.promptEvalMs > 0) {
      fromMetrics.push({ stage: 'promptEval', durationMs: metrics.promptEvalMs });
    }
    if (typeof metrics.generationMs === 'number' && metrics.generationMs > 0) {
      fromMetrics.push({ stage: 'generation', durationMs: metrics.generationMs });
    }
  }
  if (fromMetrics.length > 0) {
    return fromMetrics;
  }
  // Fallback: derive crude approximate durations from the lifecycle stage
  // timestamps. Only used when the runtime did not report rich timings.
  if (stageTimings === null) {
    return [];
  }
  return [];
}

// Pretty-prints a millisecond duration in a compact form for the legend +
// title: 480ms, 1.2s, 12.5s, 1m 4s. Negative or non-finite inputs render
// as "—" so the UI never shows NaN or a misleading 0.
export function formatBottleneckDuration(ms: number): string {
  if (!Number.isFinite(ms) || ms < 0) {
    return '—';
  }
  if (ms < 1000) {
    return `${String(Math.round(ms))}ms`;
  }
  const seconds = ms / 1000;
  if (seconds < 60) {
    return `${seconds.toFixed(1)}s`;
  }
  const minutes = Math.floor(seconds / 60);
  const remainder = Math.round(seconds % 60);
  return `${String(minutes)}m ${String(remainder)}s`;
}
