import type { MessageFeedback, MessageRole, RoutingMode } from '@/enums';

export type ChatThread = {
  id: string;
  userId: string;
  title: string | null;
  routingMode: RoutingMode;
  lastProvider: string | null;
  lastModel: string | null;
  preferredProvider: string | null;
  preferredModel: string | null;
  contextPackIds: string[];
  isPinned: boolean;
  isArchived: boolean;
  systemPrompt: string | null;
  temperature: number | null;
  maxTokens: number | null;
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
  feedback: MessageFeedback | null;
  latencyMs: number | null;
  createdAt: string;
};

export type CreateThreadRequest = {
  title?: string;
  systemPrompt?: string;
  temperature?: number;
  maxTokens?: number;
  preferredProvider?: string;
  preferredModel?: string;
  contextPackIds?: string[];
};
export type UpdateThreadRequest = {
  isPinned?: boolean;
  isArchived?: boolean;
  title?: string;
  systemPrompt?: string | null;
  temperature?: number | null;
  maxTokens?: number | null;
  preferredProvider?: string | null;
  preferredModel?: string | null;
  contextPackIds?: string[];
};
export type CreateMessageRequest = {
  threadId: string;
  content: string;
  routingMode?: RoutingMode;
  provider?: string;
  model?: string;
  fileIds?: string[];
};

export type PinThreadParams = {
  id: string;
  isPinned: boolean;
};

export type ArchiveThreadParams = {
  id: string;
  isArchived: boolean;
};

export type UpdateThreadMutationParams = {
  id: string;
  data: UpdateThreadRequest;
};
export type SetFeedbackParams = {
  messageId: string;
  feedback: MessageFeedback | null;
};

export type ThreadsListResponse = {
  data: ChatThread[];
  meta: { total: number; page: number; limit: number; totalPages: number };
};
export type MessagesListResponse = {
  data: ChatMessage[];
  meta: { total: number; page: number; limit: number; totalPages: number };
};
