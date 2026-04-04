import type { MessageRole } from "@/enums";

export interface Thread {
  id: string;
  title: string;
  lastMessageAt: string;
  messageCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface Message {
  id: string;
  threadId: string;
  role: MessageRole;
  content: string;
  model: string | null;
  tokenCount: number | null;
  createdAt: string;
}

export interface SendMessageRequest {
  threadId: string;
  content: string;
}

export interface CreateThreadRequest {
  title?: string;
}
