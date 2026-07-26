import { apiClient } from '@/services/shared/api-client';
import type {
  OwnerChatShare,
  PublishChatShareInput,
  UpdateChatShareIndexingInput,
} from '@/types/chat-share.types';
import { asOwnerChatShare } from '@/utilities/owner-chat-share.utility';

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
  /**
   * Returns null when the thread has never been shared.
   *
   * Normalised through `asOwnerChatShare` rather than returned raw. NestJS
   * serialises a `null` return as an EMPTY BODY, and axios parses an empty body as
   * `''` — so `response.data ?? null` yields `''`, which is not `null` and
   * therefore reads as "this thread IS shared" to any caller doing a null check.
   *
   * That is precisely what went wrong: the share dialog rendered its published
   * state — public-link field, "Version 0", "0 messages", Stop sharing — for
   * threads that had never been shared, and every button then failed against the
   * backend with "ChatShare not found".
   */
  async get(threadId: string): Promise<OwnerChatShare | null> {
    const response = await apiClient.get<unknown>(`/chat-threads/${threadId}/share`);
    return asOwnerChatShare(response.data);
  },

  async publish(threadId: string, input: PublishChatShareInput): Promise<OwnerChatShare> {
    const response = await apiClient.post<OwnerChatShare>(`/chat-threads/${threadId}/share`, input);
    return response.data;
  },

  /**
   * Changes indexing without republishing the snapshot.
   *
   * Takes the narrower input type on purpose: the backend PATCH schema accepts
   * `allowIndexing` alone, and re-asserting the publication acknowledgement on
   * every toggle would imply the warning is being re-consented to when it is not.
   */
  async updateIndexing(
    threadId: string,
    input: UpdateChatShareIndexingInput,
  ): Promise<OwnerChatShare> {
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
