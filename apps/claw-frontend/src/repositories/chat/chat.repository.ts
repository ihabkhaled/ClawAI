import type { MessageFeedback } from '@/enums';
import { apiClient } from '@/services/shared/api-client';
import type {
  ChatThread,
  ChatMessage,
  CreateThreadRequest,
  CreateMessageRequest,
  ThreadsListResponse,
  MessagesListResponse,
} from '@/types';

export const chatRepository = {
  async createThread(data: CreateThreadRequest): Promise<ChatThread> {
    const response = await apiClient.post<ChatThread>('/chat-threads', data);
    return response.data;
  },

  async getThreads(params?: Record<string, string>): Promise<ThreadsListResponse> {
    const response = await apiClient.get<ThreadsListResponse>('/chat-threads', params);
    return response.data;
  },

  async getThread(id: string): Promise<ChatThread> {
    const response = await apiClient.get<ChatThread>(`/chat-threads/${id}`);
    return response.data;
  },

  async updateThread(id: string, data: Partial<ChatThread>): Promise<ChatThread> {
    const response = await apiClient.patch<ChatThread>(`/chat-threads/${id}`, data);
    return response.data;
  },

  async deleteThread(id: string): Promise<void> {
    await apiClient.delete(`/chat-threads/${id}`);
  },

  async createMessage(data: CreateMessageRequest): Promise<ChatMessage> {
    const response = await apiClient.post<ChatMessage>('/chat-messages', {
      threadId: data.threadId,
      content: data.content,
    });
    return response.data;
  },

  async getMessages(
    threadId: string,
    params?: Record<string, string>,
  ): Promise<MessagesListResponse> {
    const response = await apiClient.get<MessagesListResponse>(
      `/chat-messages/thread/${threadId}`,
      params,
    );
    return response.data;
  },

  async setFeedback(messageId: string, feedback: MessageFeedback | null): Promise<ChatMessage> {
    const response = await apiClient.patch<ChatMessage>(
      `/chat-messages/${messageId}/feedback`,
      { feedback },
    );
    return response.data;
  },
};
