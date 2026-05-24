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

export type RetrievalBundle = {
  memories: RetrievalMemoryItem[];
  packItems: RetrievalPackItem[];
  assemblyOrder: string[];
  tokenBudget: number;
  tokenBudgetUsed: number;
  retrievalLatencyMs: number;
  warnings: string[];
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
