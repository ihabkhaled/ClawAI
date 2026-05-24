import type {
  MemoryRecord,
  MemoryRetention,
  MemoryScope,
  MemorySensitivity,
  MemorySource,
  MemoryType,
} from '../../../generated/prisma';
import type { MemorySort } from '../dto/list-memories-query.dto';

export interface CreateMemoryData {
  userId: string;
  type: MemoryType;
  content: string;
  sourceThreadId?: string;
  sourceMessageId?: string;
  // V2 additions
  scope?: MemoryScope;
  scopeRef?: string;
  tags?: string[];
  category?: string;
  priority?: number;
  confidence?: number;
  source?: MemorySource;
  sensitivity?: MemorySensitivity;
  retentionPolicy?: MemoryRetention;
  expiresAt?: Date;
  pinned?: boolean;
  provenanceJson?: Record<string, unknown>;
}

export interface UpdateMemoryData {
  content?: string;
  isEnabled?: boolean;
  scope?: MemoryScope;
  scopeRef?: string | null;
  tags?: string[];
  category?: string | null;
  priority?: number;
  retentionPolicy?: MemoryRetention;
  expiresAt?: Date | null;
  sensitivity?: MemorySensitivity;
  pinned?: boolean;
  pausedUntil?: Date | null;
}

export interface MemoryFilters {
  userId: string;
  type?: MemoryType;
  isEnabled?: boolean;
  search?: string;
  scope?: MemoryScope;
  scopeRef?: string;
  source?: MemorySource;
  sensitivity?: MemorySensitivity;
  tag?: string;
  category?: string;
  pinnedOnly?: boolean;
  sort?: MemorySort;
}

export type MemoryRecordResult = MemoryRecord;

export type OllamaGenerateResponse = {
  response: string;
  model: string;
  done: boolean;
};

export type ExtractedMemory = {
  type: MemoryType;
  content: string;
  confidence?: number;
  reason?: string;
};
