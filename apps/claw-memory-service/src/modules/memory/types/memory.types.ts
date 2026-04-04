import { type MemoryRecord, type MemoryType } from "../../../generated/prisma";

export interface CreateMemoryRecordInput {
  userId: string;
  type: MemoryType;
  content: string;
  sourceThreadId?: string;
  sourceMessageId?: string;
}

export interface UpdateMemoryRecordInput {
  content?: string;
  type?: MemoryType;
  isEnabled?: boolean;
}

export interface MemoryRecordFilters {
  userId: string;
  type?: MemoryType;
  isEnabled?: boolean;
}

export type MemoryRecordResult = MemoryRecord;
