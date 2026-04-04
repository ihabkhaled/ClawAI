import { type MessageRole, type RoutingMode } from "../../../generated/prisma";

export interface CreateMessageData {
  threadId: string;
  role: MessageRole;
  content: string;
  routingMode?: RoutingMode;
}

export interface MessageFilters {
  threadId: string;
}
