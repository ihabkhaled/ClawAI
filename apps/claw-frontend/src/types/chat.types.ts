import type {
  AiReasoningVisibility,
  AiStreamProgressConfidence,
  AiStreamStage,
  FallbackFailureType,
  JudgeResponseType,
  JudgeReviewDecision,
  MessageFeedback,
  MessageRole,
  RoutingMode,
  StreamBottleneckStage,
  StreamEventType,
  VisibleProgressActorType,
  VisibleProgressStageStatus,
} from '@/enums';
import type { ResearchMode } from '@/enums/research-mode.enum';

export type ChatThread = {
  id: string;
  userId: string;
  title: string | null;
  routingMode: RoutingMode;
  lastProvider: string | null;
  lastModel: string | null;
  preferredProvider: string | null;
  preferredModel: string | null;
  contextPackIds: string[];
  isPinned: boolean;
  isArchived: boolean;
  systemPrompt: string | null;
  temperature: number | null;
  maxTokens: number | null;
  judgeEnabled: boolean;
  judgeModel: string | null;
  criticEnabled: boolean;
  criticModel: string | null;
  qualityThreshold: number | null;
  maxReRouteAttempts: number | null;
  // Integration V2 — per-thread toggles
  useMemory: boolean;
  useContext: boolean;
  createdAt: string;
  updatedAt: string;
  _count?: { messages: number };
};

export type ChatMessage = {
  id: string;
  threadId: string;
  role: MessageRole;
  content: string;
  provider: string | null;
  model: string | null;
  routingMode: RoutingMode | null;
  routerModel: string | null;
  usedFallback: boolean;
  inputTokens: number | null;
  outputTokens: number | null;
  feedback: MessageFeedback | null;
  latencyMs: number | null;
  metadata: Record<string, unknown> | null;
  createdAt: string;
};

export type JudgeReview = {
  version: 1;
  judgeDecision: JudgeReviewDecision;
  judgeModel: string;
  judgeDisplayName: string;
  judgeConfidence: number;
  judgeReasoning: string;
  judgeSummary: string;
  judgeResponse: string;
  judgeResponseType: JudgeResponseType;
  criticModel: string;
  criticDisplayName: string;
  criticFeedback: string[];
  criticScore: number;
  // Human-readable single-sentence verdict from the critic. Empty string when
  // critic was not requested; set to a parse-failure marker when the critic
  // ran but its response could not be parsed. The modal uses this to decide
  // which surfacing path to take (not-requested / parse-failed / has feedback).
  criticSummary: string;
  criticRequested: boolean;
  criticParseFailed: boolean;
  originalExecutionModel: string;
  originalExecutionDisplayName: string;
  originalAnswerSnapshot: string;
  revisedAnswer: string | null;
  escalatedAnswer: string | null;
  judgeLatencyMs: number;
  criticLatencyMs: number;
  judgeTotalLatencyMs: number;
  judgeMetadata: {
    category: string;
    recommendedChanges: string[];
  };
  judgeDialogAvailable: boolean;
  generatedAt: string;
};

export type CreateThreadRequest = {
  title?: string;
  systemPrompt?: string;
  temperature?: number;
  maxTokens?: number;
  preferredProvider?: string;
  preferredModel?: string;
  contextPackIds?: string[];
};
export type UpdateThreadRequest = {
  isPinned?: boolean;
  isArchived?: boolean;
  title?: string;
  systemPrompt?: string | null;
  temperature?: number | null;
  maxTokens?: number | null;
  preferredProvider?: string | null;
  preferredModel?: string | null;
  contextPackIds?: string[];
  judgeEnabled?: boolean;
  judgeModel?: string | null;
  criticEnabled?: boolean;
  criticModel?: string | null;
  qualityThreshold?: number | null;
  maxReRouteAttempts?: number | null;
  // Integration V2 — per-thread toggles
  useMemory?: boolean;
  useContext?: boolean;
};
export type CreateMessageRequest = {
  threadId: string;
  content: string;
  routingMode?: RoutingMode;
  provider?: string;
  model?: string;
  modelDisplayName?: string;
  fileIds?: string[];
  researchMode?: ResearchMode;
  researchProviderId?: string;
};

export type PinThreadParams = {
  id: string;
  isPinned: boolean;
};

export type ArchiveThreadParams = {
  id: string;
  isArchived: boolean;
};

export type UpdateThreadMutationParams = {
  id: string;
  data: UpdateThreadRequest;
};
export type SetFeedbackParams = {
  messageId: string;
  feedback: MessageFeedback | null;
};

export type ThreadsListResponse = {
  data: ChatThread[];
  meta: { total: number; page: number; limit: number; totalPages: number };
};
export type MessagesListResponse = {
  data: ChatMessage[];
  meta: { total: number; page: number; limit: number; totalPages: number };
};

export type StreamEvent = {
  eventId?: string;
  threadId: string;
  type: StreamEventType;
  sequence?: number;
  stageId?: string;
  status?: VisibleProgressStageStatus;
  createdAt?: string;
  content?: string;
  provider?: string;
  model?: string;
  error?: string;
  label?: string;
  description?: string;
  actorType?: VisibleProgressActorType;
  actorName?: string;
  failedProvider?: string;
  failedModel?: string;
  attempt?: number;
  totalCandidates?: number;
  nextProvider?: string;
  nextModel?: string;
  criticModel?: string;
  judgeModel?: string;
  // --- Rich streaming additions (mirror backend StreamEvent) ---
  streamRunId?: string;
  laneId?: string;
  parallelGroupId?: string;
  messageId?: string;
  stage?: AiStreamStage;
  delta?: string;
  accumulatedChars?: number;
  reasoningDelta?: string;
  reasoningVisibility?: AiReasoningVisibility;
  progressPercent?: number;
  progressConfidence?: AiStreamProgressConfidence;
  metrics?: StreamMetrics;
  usage?: StreamUsage;
  code?: string;
  messageKey?: string;
  retryable?: boolean;
  partialContentPreserved?: boolean;
};

// --- Discriminated stream-event union (additive, batch-8) -------------------
// StreamEvent above stays the loose wire envelope every OTHER SSE consumer
// (use-orchestration-stages, use-best-of-n-stream, use-parallel-stream,
// role-pack-stage-mapping) parses events as — none of those are touched here.
// useChatStream is the one hook that branches on nearly every
// StreamEventType, so it is also the one place "every field optional
// regardless of `type`" let a read of a field that type never sends compile
// silently. RouterStreamEvent tightens exactly that surface: one member per
// type useChatStream branches on, carrying only the fields that type's wire
// payload actually has, plus an UnhandledStreamEvent catch-all so a
// StreamEventType this hook does not branch on yet (StreamEventType.CHUNK)
// still parses. This is deliberately additive/open, not a full closed
// tightening of StreamEvent itself — see the batch-8 handoff report for the
// scope rationale.
type StreamEventEnvelope = {
  eventId?: string;
  threadId: string;
  createdAt?: string;
};

// Fields shared by every progress-stage-shaped event (the ones useChatStream
// feeds into upsertStage()).
type ProgressStreamEventFields = StreamEventEnvelope & {
  sequence?: number;
  stageId?: string;
  status?: VisibleProgressStageStatus;
  label?: string;
  description?: string;
  actorType?: VisibleProgressActorType;
  actorName?: string;
  provider?: string;
  model?: string;
};

export type RequestAcceptedStreamEvent = ProgressStreamEventFields & {
  type: StreamEventType.REQUEST_ACCEPTED;
};
export type RouterStartedStreamEvent = ProgressStreamEventFields & {
  type: StreamEventType.ROUTER_STARTED;
};
export type RouterCompletedStreamEvent = ProgressStreamEventFields & {
  type: StreamEventType.ROUTER_COMPLETED;
};
export type ToolStartedStreamEvent = ProgressStreamEventFields & {
  type: StreamEventType.TOOL_STARTED;
};
export type ToolCompletedStreamEvent = ProgressStreamEventFields & {
  type: StreamEventType.TOOL_COMPLETED;
};
export type ResearchStartedStreamEvent = ProgressStreamEventFields & {
  type: StreamEventType.RESEARCH_STARTED;
};
export type ResearchCompletedStreamEvent = ProgressStreamEventFields & {
  type: StreamEventType.RESEARCH_COMPLETED;
};
export type ProviderSelectedStreamEvent = ProgressStreamEventFields & {
  type: StreamEventType.PROVIDER_SELECTED;
};
export type ModelProgressStreamEvent = ProgressStreamEventFields & {
  type: StreamEventType.MODEL_PROGRESS;
};
export type ResponseStreamingStreamEvent = ProgressStreamEventFields & {
  type: StreamEventType.RESPONSE_STREAMING;
};

export type FallbackAttemptStreamEvent = ProgressStreamEventFields & {
  type: StreamEventType.FALLBACK_ATTEMPT;
  failedProvider?: string;
  failedModel?: string;
  error?: string;
  attempt?: number;
  totalCandidates?: number;
  nextProvider?: string;
  nextModel?: string;
};

export type JudgeEvaluatingStreamEvent = ProgressStreamEventFields & {
  type: StreamEventType.JUDGE_EVALUATING;
  criticModel?: string;
  judgeModel?: string;
};

export type DoneStreamEvent = ProgressStreamEventFields & {
  type: StreamEventType.DONE;
  reasoningVisibility?: AiReasoningVisibility;
  stage?: AiStreamStage;
  metrics?: StreamMetrics;
  usage?: StreamUsage;
};

export type ErrorStreamEvent = ProgressStreamEventFields & {
  type: StreamEventType.ERROR;
  error?: string;
  code?: string;
  messageKey?: string;
  retryable?: boolean;
  partialContentPreserved?: boolean;
  reasoningVisibility?: AiReasoningVisibility;
  stage?: AiStreamStage;
  metrics?: StreamMetrics;
  usage?: StreamUsage;
};

export type ContentDeltaStreamEvent = StreamEventEnvelope & {
  type: StreamEventType.CONTENT_DELTA;
  delta?: string;
  accumulatedChars?: number;
};

export type ReasoningDeltaStreamEvent = StreamEventEnvelope & {
  type: StreamEventType.REASONING_DELTA;
  reasoningDelta?: string;
  reasoningVisibility?: AiReasoningVisibility;
  stage?: AiStreamStage;
  metrics?: StreamMetrics;
  usage?: StreamUsage;
};

export type LifecycleStreamEvent = StreamEventEnvelope & {
  type: StreamEventType.LIFECYCLE;
  reasoningVisibility?: AiReasoningVisibility;
  stage?: AiStreamStage;
  metrics?: StreamMetrics;
  usage?: StreamUsage;
};

export type MetricsStreamEvent = StreamEventEnvelope & {
  type: StreamEventType.METRICS;
  reasoningVisibility?: AiReasoningVisibility;
  stage?: AiStreamStage;
  metrics?: StreamMetrics;
  usage?: StreamUsage;
};

export type UsageStreamEvent = StreamEventEnvelope & {
  type: StreamEventType.USAGE;
  reasoningVisibility?: AiReasoningVisibility;
  stage?: AiStreamStage;
  metrics?: StreamMetrics;
  usage?: StreamUsage;
};

type HandledStreamEventType =
  | StreamEventType.REQUEST_ACCEPTED
  | StreamEventType.ROUTER_STARTED
  | StreamEventType.ROUTER_COMPLETED
  | StreamEventType.TOOL_STARTED
  | StreamEventType.TOOL_COMPLETED
  | StreamEventType.RESEARCH_STARTED
  | StreamEventType.RESEARCH_COMPLETED
  | StreamEventType.PROVIDER_SELECTED
  | StreamEventType.MODEL_PROGRESS
  | StreamEventType.RESPONSE_STREAMING
  | StreamEventType.FALLBACK_ATTEMPT
  | StreamEventType.JUDGE_EVALUATING
  | StreamEventType.DONE
  | StreamEventType.ERROR
  | StreamEventType.CONTENT_DELTA
  | StreamEventType.REASONING_DELTA
  | StreamEventType.LIFECYCLE
  | StreamEventType.METRICS
  | StreamEventType.USAGE;

// Any StreamEventType not enumerated above (currently just
// StreamEventType.CHUNK) — kept structurally assignable from the original
// StreamEvent shape so a frame useChatStream does not branch on still parses
// without a cast, instead of forcing an exhaustive closed union in one batch.
export type UnhandledStreamEvent = StreamEvent & {
  type: Exclude<StreamEventType, HandledStreamEventType>;
};

export type RouterStreamEvent =
  | RequestAcceptedStreamEvent
  | RouterStartedStreamEvent
  | RouterCompletedStreamEvent
  | ToolStartedStreamEvent
  | ToolCompletedStreamEvent
  | ResearchStartedStreamEvent
  | ResearchCompletedStreamEvent
  | ProviderSelectedStreamEvent
  | ModelProgressStreamEvent
  | ResponseStreamingStreamEvent
  | FallbackAttemptStreamEvent
  | JudgeEvaluatingStreamEvent
  | DoneStreamEvent
  | ErrorStreamEvent
  | ContentDeltaStreamEvent
  | ReasoningDeltaStreamEvent
  | LifecycleStreamEvent
  | MetricsStreamEvent
  | UsageStreamEvent
  | UnhandledStreamEvent;

// The subset of RouterStreamEvent useChatStream actually feeds into
// upsertStage(): every SimpleProgressStreamEvent member plus the four
// terminal/annotated types each dispatched from their own `if (parsed.type
// === …)` branch.
export type RouterProgressStageEvent =
  | RequestAcceptedStreamEvent
  | RouterStartedStreamEvent
  | RouterCompletedStreamEvent
  | ToolStartedStreamEvent
  | ToolCompletedStreamEvent
  | ResearchStartedStreamEvent
  | ResearchCompletedStreamEvent
  | ProviderSelectedStreamEvent
  | ModelProgressStreamEvent
  | ResponseStreamingStreamEvent
  | FallbackAttemptStreamEvent
  | JudgeEvaluatingStreamEvent
  | DoneStreamEvent
  | ErrorStreamEvent;

// The exact subset PROGRESS_EVENT_TYPES (constants/progress.constants.ts)
// covers — the target type of the isSimpleProgressStreamEvent() guard that
// replaces a plain `PROGRESS_EVENT_TYPES.has(parsed.type)` check (a Set
// membership test does not narrow a discriminated union by itself).
export type SimpleProgressStreamEvent =
  | RequestAcceptedStreamEvent
  | RouterStartedStreamEvent
  | RouterCompletedStreamEvent
  | ToolStartedStreamEvent
  | ToolCompletedStreamEvent
  | ResearchStartedStreamEvent
  | ResearchCompletedStreamEvent
  | ProviderSelectedStreamEvent
  | ModelProgressStreamEvent
  | ResponseStreamingStreamEvent;

// Every event type useChatStream's flushLive() is called with.
export type LiveFlushStreamEvent =
  | ReasoningDeltaStreamEvent
  | LifecycleStreamEvent
  | MetricsStreamEvent
  | UsageStreamEvent
  | DoneStreamEvent
  | ErrorStreamEvent;

// Per-stage wall-clock window captured by the streaming executor. Mirrors
// the BE StreamStageTimestamps shape exactly so the FE can render a
// stage-by-stage timeline without re-deriving the window from elapsedMs.
export type StreamStageTimestamps = {
  startedAtMs: number;
  endedAtMs?: number;
};

// Map of AiStreamStage → timestamp window. Backed by the BE
// `StreamStageTimings` record; key strings are AiStreamStage enum values.
export type StreamStageTimings = Record<string, StreamStageTimestamps>;

// Bottleneck breakdown emitted on the final METRICS frame. Mirrors the BE
// `StreamBottleneck` shape — `stage` is the slowest of model-load /
// prompt-eval / generation; `percentOfTotal` is in [0, 1].
export type StreamBottleneck = {
  stage: StreamBottleneckStage;
  durationMs: number;
  percentOfTotal: number;
};

export type StreamMetrics = {
  elapsedMs: number;
  timeToFirstTokenMs?: number;
  tokensPerSecond?: number;
  generatedTokens: number;
  estimatedTotalOutputTokens?: number;
  progressPercent: number;
  progressConfidence: AiStreamProgressConfidence;
  estimatedCostUsd?: number;
  // ── PR2: rich local-runtime metrics. Populated only on the terminal
  // METRICS frame for Ollama / llama.cpp runs. Undefined for cloud streams.
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

export type StreamUsage = {
  promptTokens?: number;
  completionTokens?: number;
  reasoningTokens?: number;
  totalTokens?: number;
  finalCostUsd?: number;
  costAvailable: boolean;
};

// Accumulated live-stream state surfaced by useChatStream to the UI.
export type StreamLiveState = {
  content: string;
  reasoning: string;
  reasoningVisibility?: AiReasoningVisibility;
  stage?: AiStreamStage;
  metrics?: StreamMetrics;
  usage?: StreamUsage;
  isStreaming: boolean;
};

// Per-lane live state for parallel/compare runs, keyed by `${provider}:${model}`.
export type LaneStreamState = StreamLiveState & {
  provider: string;
  model: string;
};

export type LaneStreamMap = Record<string, LaneStreamState>;

export type VisibleProgressStage = {
  id: string;
  type: StreamEventType;
  label: string;
  description?: string;
  actorType?: VisibleProgressActorType;
  actorName?: string;
  provider?: string;
  model?: string;
  status: VisibleProgressStageStatus;
  timestamp: number;
  sequence?: number;
  createdAt?: string;
};

export type SseConnection = {
  close: () => void;
};

export type FallbackAttemptInfo = {
  failedProvider: string;
  failedModel: string;
  error: string;
  attempt: number;
  totalCandidates: number;
  nextProvider?: string;
  nextModel?: string;
  timestamp: number;
  failureType?: FallbackFailureType;
};

export type UseEditableTitleReturn = {
  isEditing: boolean;
  editValue: string;
  setEditValue: (value: string) => void;
  isPending: boolean;
  startEditing: () => void;
  cancelEditing: () => void;
  saveTitle: () => void;
  handleKeyDown: (e: React.KeyboardEvent<HTMLInputElement>) => void;
};

export type UseVirtualizedMessagesReturn = {
  messages: ChatMessage[];
  isLoading: boolean;
  isFetchingPreviousPage: boolean;
  isFetchingNextPage: boolean;
  hasPreviousPage: boolean;
  hasNextPage: boolean;
  fetchPreviousPage: () => void;
  fetchNextPage: () => void;
  totalCount: number;
  firstItemIndex: number;
};

export type JudgeModelOption = {
  value: string | null;
  label: string;
};

export type MessageRenderItem =
  { kind: 'single'; message: ChatMessage } | { kind: 'parallel'; messages: ChatMessage[] };

export type ParallelExpandedMessage = {
  message: ChatMessage;
  isFastest: boolean;
};

export type UseVirtualizedThreadsReturn = {
  threads: ChatThread[];
  isLoading: boolean;
  isFetchingNextPage: boolean;
  hasNextPage: boolean;
  fetchNextPage: () => void;
  totalCount: number;
};
