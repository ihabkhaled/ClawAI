import { type MemoryRecord, type MemoryType } from "../../../generated/prisma";

export interface CreateMemoryData {
  userId: string;
  type: MemoryType;
  content: string;
  sourceThreadId?: string;
  sourceMessageId?: string;
}

export interface UpdateMemoryData {
  content?: string;
  isEnabled?: boolean;
}

export interface MemoryFilters {
  userId: string;
  type?: MemoryType;
  isEnabled?: boolean;
  search?: string;
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
};
