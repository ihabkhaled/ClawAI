import { type ChatMessage } from "../../../generated/prisma";

export type AssembledContext = {
  systemPrompt: string | null;
  threadMessages: ChatMessage[];
  memories: MemoryRecordResponse[];
  contextPackItems: Array<{ content: string | null; type: string }>;
  tokenBudget: number;
};

export type MemoryRecordResponse = {
  id: string;
  userId: string;
  type: string;
  content: string;
  isEnabled: boolean;
};

export type ContextPackResponse = {
  id: string;
  name: string;
  items: Array<{
    id: string;
    type: string;
    content: string | null;
    sortOrder: number;
  }>;
};
