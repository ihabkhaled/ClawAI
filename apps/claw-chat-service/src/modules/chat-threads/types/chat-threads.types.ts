import { type ChatThread, type RoutingMode } from "../../../generated/prisma";

export interface CreateThreadData {
  userId: string;
  title?: string;
  routingMode?: RoutingMode;
}

export interface UpdateThreadData {
  title?: string;
  isPinned?: boolean;
  isArchived?: boolean;
  routingMode?: RoutingMode;
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
