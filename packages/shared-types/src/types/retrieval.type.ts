import {
  type ContextPackItemType,
  type MemoryScope,
  type MemorySensitivity,
  type MemoryType,
  type RetrievalReason,
} from '../enums';

export type RetrievalMemoryItem = {
  id: string;
  type: MemoryType;
  content: string | null;
  scope: MemoryScope;
  scopeRef: string | null;
  score: number;
  reason: RetrievalReason;
  sensitivity: MemorySensitivity;
  sourceThreadId: string | null;
  sourceMessageId: string | null;
};

export type RetrievalPackItem = {
  id: string;
  contextPackId: string;
  itemType: ContextPackItemType;
  content: string | null;
  score: number;
  reason: RetrievalReason;
  pinned: boolean;
  tokenCountEstimate: number;
};

/**
 * What the model was given from the CONVERSATION, and what it was not.
 *
 * Added because the receipt used to account for memories and context-pack
 * items only. A user could see a hundred messages in a thread, be shown a
 * receipt saying "0 memories", and have no way at all to learn that the model
 * had been handed one of those hundred messages. "The message is visibly in
 * the thread" and "the model was actually given it" were indistinguishable.
 *
 * Optional so receipts written before ADR-089 still parse.
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
  /**
   * Cross-thread retrieval (ADR-087). `priorThreadsUsed` is empty whenever the
   * feature is off, which is the default; `crossThreadSkipReason` says which of
   * the seven reasons applied, so "nothing was retrieved" is never ambiguous.
   */
  priorThreadsSearched: string[];
  priorThreadsUsed: string[];
  priorMessageIds: string[];
  crossThreadSkipReason: string | null;
};

export type RetrievalBundle = {
  memories: RetrievalMemoryItem[];
  packItems: RetrievalPackItem[];
  assemblyOrder: string[];
  tokenBudget: number;
  tokenBudgetUsed: number;
  retrievalLatencyMs: number;
  warnings: string[];
  /** Present on every receipt written since ADR-089. */
  conversation?: RetrievalConversationSummary;
};

export type RetrievalRequest = {
  userId: string;
  threadId?: string;
  workspaceId?: string;
  projectId?: string;
  intent: string;
  attachedPackIds: string[];
  attachedMemoryIds: string[];
  tokenBudget: number;
  includeMemory: boolean;
  includeContext: boolean;
  semanticBudgetMemory?: number;
  semanticBudgetContext?: number;
};

export type ContextReceipt = RetrievalBundle & {
  messageId: string;
  threadId: string;
  userId: string;
  createdAt: string;
};
