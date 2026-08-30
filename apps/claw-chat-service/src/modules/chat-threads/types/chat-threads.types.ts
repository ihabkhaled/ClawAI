import { type ChatThread, type RoutingMode } from '../../../generated/prisma';

export interface CreateThreadData {
  userId: string;
  title?: string;
  routingMode?: RoutingMode;
  systemPrompt?: string;
  temperature?: number;
  maxTokens?: number;
  preferredProvider?: string;
  preferredModel?: string;
  contextPackIds?: string[];
  /** ADR-087 — "use relevant previous chats". Omitted means false. */
  useCrossThreadContext?: boolean;
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
  preferredProvider?: string | null;
  preferredModel?: string | null;
  contextPackIds?: string[];
  judgeEnabled?: boolean;
  judgeModel?: string | null;
  criticEnabled?: boolean;
  criticModel?: string | null;
  qualityThreshold?: number | null;
  maxReRouteAttempts?: number | null;
  useMemory?: boolean;
  useContext?: boolean;
  useCrossThreadContext?: boolean;
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

export type SeedThreadInput = {
  userId: string;
  systemPrompt?: string;
  initialUserMessage: string;
  title?: string;
};
