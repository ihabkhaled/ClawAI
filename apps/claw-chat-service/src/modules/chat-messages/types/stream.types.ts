import {
  type AiReasoningVisibility,
  type AiStreamProgressConfidence,
  type AiStreamProtocol,
  type AiStreamStage,
  type ProgressActorType,
  type StreamEventType,
} from '../../../common/enums';

export type VisibleProgressStatus = 'queued' | 'active' | 'completed' | 'error';

// Per-stage timestamp window captured by the streaming executor. The bounds
// are wall-clock milliseconds (`Date.now()`) so the FE can render a stage
// timeline without re-deriving them from the elapsed time. `endedAtMs` is
// undefined while the stage is still active.
export type StreamStageTimestamps = {
  startedAtMs: number;
  endedAtMs?: number;
};

// Map of AiStreamStage → timestamp window. Used by the FE to render a
// stage-by-stage timeline + the bottleneck breakdown bar. Only stages that
// actually fired during the run appear as keys.
export type StreamStageTimings = Record<string, StreamStageTimestamps>;

// Bottleneck breakdown emitted on the final METRICS frame. `stage` is the
// slowest of (modelLoadMs, promptEvalMs, generationMs); `percentOfTotal` is
// a fraction in [0, 1] so the FE can multiply by 100 for display or pipe it
// into a progress bar.
export type StreamBottleneck = {
  stage: 'modelLoad' | 'promptEval' | 'generation';
  durationMs: number;
  percentOfTotal: number;
};

// Live metrics computed by StreamProgressManager and pushed on METRICS events.
export type StreamMetrics = {
  elapsedMs: number;
  timeToFirstTokenMs?: number;
  tokensPerSecond?: number;
  generatedTokens: number;
  estimatedTotalOutputTokens?: number;
  progressPercent: number;
  progressConfidence: AiStreamProgressConfidence;
  estimatedCostUsd?: number;
  // ── PR2: rich local-runtime metrics. Populated on the terminal METRICS
  // frame for Ollama / llama.cpp runs that report nanosecond-precision
  // durations. Undefined for cloud streams (no parity field on the wire).
  modelLoadMs?: number;
  promptEvalMs?: number;
  generationMs?: number;
  totalMs?: number;
  promptTokens?: number;
  outputTokens?: number;
  totalTokens?: number;
  bottleneck?: StreamBottleneck;
  stageTimings?: StreamStageTimings;
};

// Subset of StreamMetrics that the rich-final-frame path (Ollama terminal
// timings) can populate. The caller spreads this into a base StreamMetrics so
// the live tracker's progressPercent / progressConfidence / etc. survive
// unchanged. Every field is optional because not every runtime / version
// reports it.
export type FinalStreamMetricsPatch = Pick<
  StreamMetrics,
  | 'modelLoadMs'
  | 'promptEvalMs'
  | 'generationMs'
  | 'totalMs'
  | 'tokensPerSecond'
  | 'promptTokens'
  | 'outputTokens'
  | 'totalTokens'
  | 'bottleneck'
>;

// Final accounting pushed on USAGE events once the provider reports totals.
export type StreamUsage = {
  promptTokens?: number;
  completionTokens?: number;
  reasoningTokens?: number;
  totalTokens?: number;
  finalCostUsd?: number;
  costAvailable: boolean;
};

// Payload emitted on every RESEARCH_PROGRESS frame so the FE can render
// what the enricher is doing right now. All fields are optional so the
// shape works for STARTED (mode+query only), SOURCES_FOUND (+sourcesCount),
// FETCHING (+currentUrl), COMPLETED (final sourcesCount), and FAILED
// (+error). `mode` carries the ResearchMode label as a string to avoid
// coupling stream.types to the ResearchMode enum.
export type ResearchProgressDetails = {
  mode?: string;
  query?: string;
  sourcesCount?: number;
  currentUrl?: string;
  error?: string;
};

export type StreamEvent = {
  eventId?: string;
  threadId: string;
  type: StreamEventType;
  sequence?: number;
  stageId?: string;
  status?: VisibleProgressStatus;
  createdAt?: string;
  content?: string;
  provider?: string;
  model?: string;
  error?: string;
  label?: string;
  description?: string;
  actorType?: ProgressActorType;
  actorName?: string;
  failedProvider?: string;
  failedModel?: string;
  attempt?: number;
  totalCandidates?: number;
  nextProvider?: string;
  nextModel?: string;
  criticModel?: string;
  judgeModel?: string;
  // --- Rich streaming additions ---
  // Identifies the run; for parallel/compare each model gets its own laneId.
  streamRunId?: string;
  laneId?: string;
  parallelGroupId?: string;
  messageId?: string;
  protocol?: AiStreamProtocol;
  stage?: AiStreamStage;
  // Live content/reasoning text. `delta` is NOT length-capped or pattern-
  // sanitized like `label`/`description` — it is the model's actual answer.
  delta?: string;
  accumulatedChars?: number;
  reasoningDelta?: string;
  reasoningVisibility?: AiReasoningVisibility;
  // Progress + metrics.
  progressPercent?: number;
  progressConfidence?: AiStreamProgressConfidence;
  metrics?: StreamMetrics;
  usage?: StreamUsage;
  // Error semantics for partial-output handling.
  code?: string;
  messageKey?: string;
  retryable?: boolean;
  partialContentPreserved?: boolean;
  // RESEARCH_PROGRESS payload (compare-mode research-enricher lifecycle).
  researchDetails?: ResearchProgressDetails;
};

// Shared identity for rich-stream emitters (one model run / lane).
export type StreamRunRef = {
  provider: string;
  model: string;
  streamRunId?: string;
  messageId?: string;
  laneId?: string;
  parallelGroupId?: string;
};

export type LifecycleEmitInput = StreamRunRef & {
  stage: AiStreamStage;
  label: string;
  description?: string;
  protocol?: AiStreamProtocol;
  progressPercent?: number;
  progressConfidence?: AiStreamProgressConfidence;
  reasoningVisibility?: AiReasoningVisibility;
  status?: VisibleProgressStatus;
};

export type ContentDeltaEmitInput = StreamRunRef & {
  delta: string;
  accumulatedChars: number;
};

export type ReasoningDeltaEmitInput = StreamRunRef & {
  reasoningDelta: string;
  visibility: AiReasoningVisibility;
};

export type MetricsEmitInput = StreamRunRef & {
  metrics: StreamMetrics;
};

export type UsageEmitInput = StreamRunRef & {
  usage: StreamUsage;
};

export type StreamErrorEmitInput = StreamRunRef & {
  stage: AiStreamStage;
  code: string;
  messageKey?: string;
  safeMessage: string;
  retryable: boolean;
  partialContentPreserved: boolean;
};

export type StreamErrorMetadata = {
  code?: string;
  messageKey?: string;
};

export type ResearchProgressEmitInput = {
  stage: AiStreamStage;
  details?: ResearchProgressDetails;
  label?: string;
  description?: string;
};

export type CancelStreamResult = {
  cancelled: boolean;
};
