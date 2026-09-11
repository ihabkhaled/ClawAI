import type { InfiniteData, QueryClient } from '@tanstack/react-query';

import { queryKeys } from '@/repositories/shared/query-keys';
import type { MessagesListResponse } from '@/types';

/**
 * Merges a freshly-polled page 1 into the messages cache without touching any
 * other page.
 *
 * The poll that keeps page 1 current while a response is in flight used to
 * run through TanStack Query's `refetchInterval`, which refetches EVERY
 * currently loaded page in sequence on each tick — cheap on a fresh thread,
 * but on one whose history has been scrolled back through, each tick re-pulled
 * every page loaded so far. New messages only ever land on page 1
 * (`orderBy: createdAt desc`), so refreshing anything past it buys nothing.
 *
 * Also closes the REST path's missing ordering guard: a page fetched earlier
 * can still resolve after one fetched later (retry, network jitter, a slow
 * tick overtaken by a faster one). `meta.total` only grows as a thread gets
 * replies, so a response reporting a LOWER total than what is already cached
 * is by definition older than what is showing, and is dropped rather than
 * clobbering fresher data with stale.
 */
export function mergeLatestMessagesPageIntoCache(
  queryClient: QueryClient,
  threadId: string,
  freshPage: MessagesListResponse,
): void {
  queryClient.setQueryData<InfiniteData<MessagesListResponse>>(
    queryKeys.threads.messagesInfinite(threadId),
    (old) => {
      if (old === undefined || old.pages.length === 0) {
        return old;
      }
      const cachedNewestPage = old.pages[0];
      if (cachedNewestPage !== undefined && freshPage.meta.total < cachedNewestPage.meta.total) {
        return old;
      }
      return {
        ...old,
        pages: [freshPage, ...old.pages.slice(1)],
      };
    },
  );
}
