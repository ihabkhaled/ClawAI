import { apiClient } from '@/services/shared/api-client';
import type { OwnerChatShare, PublishChatShareInput } from '@/types/chat-share.types';

/**
 * The only place the browser talks to the share-management API.
 *
 * Note what is never sent: an owner id. The server resolves the owner from the
 * JWT and independently re-checks that the thread belongs to them, so a caller
 * cannot publish somebody else's conversation by naming their user id.
 *
 * The public read endpoint is deliberately absent from this file — it is fetched
 * server-side by the public page (see `public-chat-share.service.ts`) so that
 * search engines receive server-rendered chat text rather than an empty shell.
 */
export const chatSharesRepository = {
  /** Returns null when the thread has never been shared. */
  async get(threadId: string): Promise<OwnerChatShare | null> {
    const response = await apiClient.get<OwnerChatShare | null>(`/chat-threads/${threadId}/share`);
    return response.data;
  },

  async publish(threadId: string, input: PublishChatShareInput): Promise<OwnerChatShare> {
    const response = await apiClient.post<OwnerChatShare>(`/chat-threads/${threadId}/share`, input);
    return response.data;
  },

  /** Changes indexing without republishing the snapshot. */
  async updateIndexing(threadId: string, input: PublishChatShareInput): Promise<OwnerChatShare> {
    const response = await apiClient.patch<OwnerChatShare>(
      `/chat-threads/${threadId}/share`,
      input,
    );
    return response.data;
  },

  /** Publishes the thread's current history as the next snapshot version. */
  async refresh(threadId: string): Promise<OwnerChatShare> {
    const response = await apiClient.post<OwnerChatShare>(
      `/chat-threads/${threadId}/share/refresh`,
    );
    return response.data;
  },

  /** Issues a new identifier. The previous URL is permanently dead. */
  async regenerateUrl(threadId: string): Promise<OwnerChatShare> {
    const response = await apiClient.post<OwnerChatShare>(
      `/chat-threads/${threadId}/share/regenerate-url`,
    );
    return response.data;
  },

  async revoke(threadId: string): Promise<void> {
    await apiClient.delete(`/chat-threads/${threadId}/share`);
  },
};
