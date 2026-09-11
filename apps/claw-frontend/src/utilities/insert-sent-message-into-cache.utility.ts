import type { InfiniteData, QueryClient } from '@tanstack/react-query';

import { queryKeys } from '@/repositories/shared/query-keys';
import type { ChatMessage, MessagesListResponse } from '@/types';

/**
 * Writes a just-sent message straight into the cache the thread page renders
 * from, instead of discarding it and asking the network for it back.
 *
 * `POST /chat-messages` already returns the full persisted message — real id,
 * real `createdAt`, the lot. Every send used to throw that away and call
 * `invalidateThreadMessages`, which cost a whole extra round trip to fetch back
 * the exact object the mutation was holding. This is not an optimistic
 * update — there is nothing to reconcile or roll back, because the data being
 * written is already the authoritative response, not a guess made ahead of it.
 *
 * Page 1 is the newest page (`orderBy: createdAt desc`), so the message is
 * prepended there and nowhere else. A thread with no cached page yet (a send
 * racing the very first load) is left alone — `old` stays `undefined` and the
 * eventual real fetch populates it normally; fabricating a one-page cache
 * shape here would risk it disagreeing with what the server actually returns
 * for `meta.limit`. `meta.nextBefore` (the cursor to the next OLDER page) is
 * untouched by prepending a newer message — it still points at whatever the
 * oldest message in this page already was.
 */
export function insertSentMessageIntoCache(
  queryClient: QueryClient,
  threadId: string,
  message: ChatMessage,
): void {
  queryClient.setQueryData<InfiniteData<MessagesListResponse>>(
    queryKeys.threads.messagesInfinite(threadId),
    (old) => {
      if (old === undefined || old.pages.length === 0) {
        return old;
      }
      const newestPage = old.pages[0];
      if (newestPage === undefined) {
        return old;
      }
      // Idempotent: a refetch that lands between the POST resolving and this
      // running would otherwise produce a visible duplicate.
      if (newestPage.data.some((existing) => existing.id === message.id)) {
        return old;
      }
      const updatedNewestPage: MessagesListResponse = {
        data: [message, ...newestPage.data],
        meta: { ...newestPage.meta, total: newestPage.meta.total + 1 },
      };
      return {
        ...old,
        pages: [updatedNewestPage, ...old.pages.slice(1)],
      };
    },
  );
}
