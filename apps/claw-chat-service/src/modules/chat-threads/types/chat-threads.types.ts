import { type ChatThread, type RoutingMode } from "../../../generated/prisma";

export interface CreateThreadData {
  userId: string;
  title?: string;
  routingMode?: RoutingMode;
  systemPrompt?: string;
  temperature?: number;
  maxTokens?: number;
}

export interface UpdateThreadData {
  title?: string;
  isPinned?: boolean;
  isArchived?: boolean;
  routingMode?: RoutingMode;
  lastProvider?: string;
  lastModel?: string;
  systemPrompt?: string | null;
  temperature?: number | null;
  maxTokens?: number | null;
}

export interface ThreadFilters {
  userId: string;
  search?: string;
  isPinned?: boolean;
  isArchived?: boolean;
}

export interface ThreadWithMessageCount extends ChatThread {
  _count: { messages: number };
}
