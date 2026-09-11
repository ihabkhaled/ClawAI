import { type MessageRole, type Prisma, type RoutingMode } from '../../../generated/prisma';

export type CreateMessageData = {
  id?: string;
  threadId: string;
  role: MessageRole;
  content: string;
  routingMode?: RoutingMode;
  provider?: string;
  model?: string;
  routerModel?: string | null;
  inputTokens?: number;
  outputTokens?: number;
  latencyMs?: number;
  usedFallback?: boolean;
  metadata?: Prisma.InputJsonValue;
};

export type MessageFilters = {
  threadId: string;
};

/**
 * Keyset (cursor) pagination result for the messages list, distinct from the
 * shared `PaginatedResult` (page/totalPages) that chat-threads and other
 * modules still use. `nextBefore` is the id to pass back as `before` to fetch
 * the next older page; `null` means there is nothing older left.
 */
export type CursorPaginatedResult<T> = {
  data: T[];
  meta: {
    total: number;
    limit: number;
    nextBefore: string | null;
  };
};
