import {
  type AiReasoningVisibility,
  type AiStreamProgressConfidence,
  type AiStreamProtocol,
  type AiStreamStage,
  type ProgressActorType,
  type StreamEventType,
} from '../../../common/enums';

export type VisibleProgressStatus = 'queued' | 'active' | 'completed' | 'error';

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
};

// Final accounting pushed on USAGE events once the provider reports totals.
export type StreamUsage = {
  promptTokens?: number;
  completionTokens?: number;
  reasoningTokens?: number;
  totalTokens?: number;
  finalCostUsd?: number;
  costAvailable: boolean;
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
  retryable?: boolean;
  partialContentPreserved?: boolean;
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
  safeMessage: string;
  retryable: boolean;
  partialContentPreserved: boolean;
};

export type CancelStreamResult = {
  cancelled: boolean;
};
