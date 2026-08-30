import type {
  ContextPackItemTypeV2,
  MemoryScope,
  MemorySensitivity,
  MemoryType,
  RetrievalReason,
} from '@/enums';

export type RetrievalReasonValue = RetrievalReason;

export type RetrievalMemoryEntry = {
  id: string;
  type: MemoryType;
  content: string | null;
  scope: MemoryScope;
  scopeRef: string | null;
  score: number;
  reason: RetrievalReasonValue;
  sensitivity: MemorySensitivity;
  sourceThreadId: string | null;
  sourceMessageId: string | null;
};

export type RetrievalPackEntry = {
  id: string;
  contextPackId: string;
  itemType: ContextPackItemTypeV2;
  content: string | null;
  score: number;
  reason: RetrievalReasonValue;
  pinned: boolean;
  tokenCountEstimate: number;
};

/**
 * What the model was actually given from the conversation.
 *
 * Optional because receipts written before ADR-086 do not carry it. When it is
 * absent the inspector says so rather than implying the thread was fully sent.
 */
export type RetrievalConversationSummary = {
  totalThreadMessages: number;
  includedMessageIds: string[];
  includedTurnCount: number;
  omittedMessageIds: string[];
  omissionReasons: Record<string, string>;
  estimatedInputTokens: number;
  contextWindowTokens: number;
  reservedOutputTokens: number;
  availableInputTokens: number;
  contextWindowSource: string;
  referenceSignals: string[];
  /** Cross-thread retrieval (ADR-087). Empty and `DISABLED` unless opted in. */
  priorThreadsSearched: string[];
  priorThreadsUsed: string[];
  priorMessageIds: string[];
  crossThreadSkipReason: string | null;
  /** Network cost of fetching every context source, concurrently. */
  retrievalMs: number;
  /** In-memory cost of grouping, scoring and fitting the conversation. */
  selectionMs: number;
};

export type RetrievalBundle = {
  memories: RetrievalMemoryEntry[];
  packItems: RetrievalPackEntry[];
  assemblyOrder: string[];
  tokenBudget: number;
  tokenBudgetUsed: number;
  retrievalLatencyMs: number;
  warnings: string[];
  conversation?: RetrievalConversationSummary;
};

export type ContextReceipt = RetrievalBundle & {
  messageId: string;
  threadId: string;
  userId: string;
  createdAt: string;
};

export type PreviewContextRequest = {
  draft: string;
  disableMemory?: boolean;
  disableContext?: boolean;
};
