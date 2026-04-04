import type { RoutingMode, MessageRole } from "@/enums";

export type ChatThread = {
  id: string;
  userId: string;
  title: string | null;
  routingMode: RoutingMode;
  lastProvider: string | null;
  lastModel: string | null;
  isPinned: boolean;
  isArchived: boolean;
  createdAt: string;
  updatedAt: string;
  _count?: { messages: number };
};

export type ChatMessage = {
  id: string;
  threadId: string;
  role: MessageRole;
  content: string;
  provider: string | null;
  model: string | null;
  routingMode: RoutingMode | null;
  routerModel: string | null;
  usedFallback: boolean;
  inputTokens: number | null;
  outputTokens: number | null;
  latencyMs: number | null;
  createdAt: string;
};

export type CreateThreadRequest = { title?: string };
export type CreateMessageRequest = { threadId: string; content: string };
export type ThreadsListResponse = {
  data: ChatThread[];
  total: number;
  page: number;
  totalPages: number;
};
export type MessagesListResponse = {
  data: ChatMessage[];
  total: number;
  page: number;
  totalPages: number;
};
