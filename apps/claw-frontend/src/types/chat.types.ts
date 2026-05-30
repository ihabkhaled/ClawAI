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
  retryable?: boolean;
  partialContentPreserved?: boolean;
};

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
  stage: 'modelLoad' | 'promptEval' | 'generation';
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
  | { kind: 'single'; message: ChatMessage }
  | { kind: 'parallel'; messages: ChatMessage[] };

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
