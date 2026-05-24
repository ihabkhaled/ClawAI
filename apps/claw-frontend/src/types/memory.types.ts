import type {
  MemoryAuditAction,
  MemoryFilterValue,
  MemoryRetention,
  MemoryScope,
  MemorySensitivity,
  MemorySource,
  MemorySuggestionStatus,
  MemoryType,
} from '@/enums';

import type { FormFieldErrors } from './component.types';

export type MemoryRecord = {
  id: string;
  userId: string;
  type: MemoryType;
  content: string;
  sourceThreadId: string | null;
  sourceMessageId: string | null;
  isEnabled: boolean;
  scope: MemoryScope;
  scopeRef: string | null;
  tags: string[];
  category: string | null;
  priority: number;
  confidence: number;
  source: MemorySource;
  sensitivity: MemorySensitivity;
  retentionPolicy: MemoryRetention;
  expiresAt: string | null;
  pinned: boolean;
  pausedUntil: string | null;
  qualityScore: number;
  useCount: number;
  lastUsedAt: string | null;
  provenanceJson: Record<string, unknown> | null;
  createdAt: string;
  updatedAt: string;
};

export type MemorySuggestion = {
  id: string;
  userId: string;
  type: MemoryType;
  content: string;
  sourceThreadId: string | null;
  sourceMessageId: string | null;
  confidence: number;
  sensitivity: MemorySensitivity;
  reason: string | null;
  status: MemorySuggestionStatus;
  decidedAt: string | null;
  decidedBy: string | null;
  resultingMemoryId: string | null;
  createdAt: string;
};

export type MemoryAuditLog = {
  id: string;
  memoryId: string | null;
  userId: string;
  action: MemoryAuditAction;
  actor: string;
  details: Record<string, unknown> | null;
  createdAt: string;
};

export type MemoryUsageEntry = {
  id: string;
  memoryId: string;
  userId: string;
  threadId: string;
  messageId: string;
  score: number;
  reason: string | null;
  createdAt: string;
};

export type MemoryPreference = {
  userId: string;
  pausedAll: boolean;
  autoApproveThreshold: number;
  defaultRetention: MemoryRetention;
  defaultExpiresInDays: number | null;
  redactByDefault: boolean;
  updatedAt: string;
};

export type UpsertMemoryPreferenceRequest = {
  pausedAll?: boolean;
  autoApproveThreshold?: number;
  defaultRetention?: MemoryRetention;
  defaultExpiresInDays?: number | null;
  redactByDefault?: boolean;
};

export type ApproveSuggestionRequest = {
  editedContent?: string;
  scope?: MemoryScope;
  scopeRef?: string;
  retentionPolicy?: MemoryRetention;
  expiresAt?: string;
};

export type RejectSuggestionRequest = {
  reason?: string;
  suppressSimilar?: boolean;
};

export type BulkApproveSkippedEntry = {
  suggestionId: string;
  reason: string;
};

export type BulkApproveResult = {
  approved: string[];
  skipped: BulkApproveSkippedEntry[];
};

export type CreateMemoryRequest = {
  type: MemoryType;
  content: string;
  sourceThreadId?: string;
  sourceMessageId?: string;
  scope?: MemoryScope;
  scopeRef?: string;
  tags?: string[];
  category?: string;
  priority?: number;
  confidence?: number;
  source?: MemorySource;
  sensitivity?: MemorySensitivity;
  retentionPolicy?: MemoryRetention;
  expiresAt?: string;
  pinned?: boolean;
  provenanceJson?: Record<string, unknown>;
};

export type UpdateMemoryRequest = {
  content?: string;
  type?: MemoryType;
  isEnabled?: boolean;
  scope?: MemoryScope;
  scopeRef?: string | null;
  tags?: string[];
  category?: string | null;
  priority?: number;
  retentionPolicy?: MemoryRetention;
  expiresAt?: string | null;
  sensitivity?: MemorySensitivity;
  pinned?: boolean;
  pausedUntil?: string | null;
};

export type MemoryFilterType = MemoryType | MemoryFilterValue.ALL;

export type ToggleMemoryParams = {
  id: string;
};

export type UpdateMemoryParams = {
  id: string;
  data: UpdateMemoryRequest;
};

export type MemoryFormStateParams = {
  open: boolean;
  memory?: MemoryRecord | null;
  onSubmit: (data: CreateMemoryRequest) => void;
  onOpenChange: (open: boolean) => void;
};

export type MemoryFormStateReturn = {
  type: MemoryType | null;
  setType: (value: MemoryType) => void;
  content: string;
  setContent: (value: string) => void;
  fieldErrors: FormFieldErrors;
  isEditing: boolean;
  pendingLabel: string;
  submitLabel: string;
  handleSubmit: (e: React.FormEvent) => void;
  handleOpenChange: (nextOpen: boolean) => void;
};
