import { apiClient } from "@/services/shared/api-client";
import type {
  ChatThread,
  ChatMessage,
  CreateThreadRequest,
  CreateMessageRequest,
  ThreadsListResponse,
  MessagesListResponse,
} from "@/types";

export const chatRepository = {
  async createThread(data: CreateThreadRequest): Promise<ChatThread> {
    const response = await apiClient.post<ChatThread>("/threads", data);
    return response.data;
  },

  async getThreads(
    params?: Record<string, string>,
  ): Promise<ThreadsListResponse> {
    const response = await apiClient.get<ThreadsListResponse>(
      "/threads",
      params,
    );
    return response.data;
  },

  async getThread(id: string): Promise<ChatThread> {
    const response = await apiClient.get<ChatThread>(`/threads/${id}`);
    return response.data;
  },

  async updateThread(
    id: string,
    data: Partial<ChatThread>,
  ): Promise<ChatThread> {
    const response = await apiClient.patch<ChatThread>(`/threads/${id}`, data);
    return response.data;
  },

  async deleteThread(id: string): Promise<void> {
    await apiClient.delete(`/threads/${id}`);
  },

  async createMessage(data: CreateMessageRequest): Promise<ChatMessage> {
    const response = await apiClient.post<ChatMessage>(
      `/threads/${data.threadId}/messages`,
      { content: data.content },
    );
    return response.data;
  },

  async getMessages(
    threadId: string,
    params?: Record<string, string>,
  ): Promise<MessagesListResponse> {
    const response = await apiClient.get<MessagesListResponse>(
      `/threads/${threadId}/messages`,
      params,
    );
    return response.data;
  },
};
