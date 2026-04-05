import { type MessageRole, type RoutingMode } from "../../../generated/prisma";

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
};

export type MessageFilters = {
  threadId: string;
};
