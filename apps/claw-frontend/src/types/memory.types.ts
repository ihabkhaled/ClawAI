import type { MemoryType } from "@/enums";

export type MemoryRecord = {
  id: string;
  userId: string;
  type: MemoryType;
  content: string;
  sourceThreadId: string | null;
  sourceMessageId: string | null;
  isEnabled: boolean;
  createdAt: string;
  updatedAt: string;
};

export type CreateMemoryRequest = {
  type: MemoryType;
  content: string;
  sourceThreadId?: string;
  sourceMessageId?: string;
};

export type UpdateMemoryRequest = {
  content?: string;
  type?: MemoryType;
  isEnabled?: boolean;
};
