import type {
  MemorySensitivity,
  MemorySuggestionStatus,
  MemoryType,
} from '../../../generated/prisma';

export type CreateSuggestionData = {
  userId: string;
  type: MemoryType;
  content: string;
  confidence: number;
  sensitivity: MemorySensitivity;
  reason?: string | null;
  sourceThreadId?: string | null;
  sourceMessageId?: string | null;
};

export type SuggestionFilters = {
  userId: string;
  status?: MemorySuggestionStatus;
};

export type DecideSuggestionData = {
  status: MemorySuggestionStatus;
  decidedBy: string;
  resultingMemoryId?: string | null;
};

export type BulkApprovalResult = {
  approved: string[];
  skipped: Array<{ suggestionId: string; reason: string }>;
};
