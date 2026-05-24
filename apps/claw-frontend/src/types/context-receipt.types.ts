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

export type RetrievalBundle = {
  memories: RetrievalMemoryEntry[];
  packItems: RetrievalPackEntry[];
  assemblyOrder: string[];
  tokenBudget: number;
  tokenBudgetUsed: number;
  retrievalLatencyMs: number;
  warnings: string[];
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
