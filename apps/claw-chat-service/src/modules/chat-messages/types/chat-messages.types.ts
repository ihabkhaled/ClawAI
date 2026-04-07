import { type MessageRole, type Prisma, type RoutingMode } from "../../../generated/prisma";

export type CreateMessageData = {
  threadId: string;
  role: MessageRole;
  content: string;
  routingMode?: RoutingMode;
  provider?: string;
  model?: string;
  inputTokens?: number;
  outputTokens?: number;
  latencyMs?: number;
  usedFallback?: boolean;
  metadata?: Prisma.InputJsonValue;
};

export type MessageFilters = {
  threadId: string;
};
