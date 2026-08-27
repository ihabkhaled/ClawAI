import { useInfiniteQuery } from '@tanstack/react-query';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { MESSAGE_POLL_INTERVAL_MS, MESSAGES_PAGE_SIZE, VIRTUOSO_START_INDEX } from '@/constants';
import { chatRepository } from '@/repositories/chat/chat.repository';
import { queryKeys } from '@/repositories/shared/query-keys';
import type { ChatMessage, UseVirtualizedMessagesReturn } from '@/types';
import { logger } from '@/utilities';

/**
 * The message list, paginated backwards from the newest page.
 *
 * `isAwaitingResponse` gates the background refetch. It used to poll every five
 * seconds unconditionally, forever, on every open thread — including one nobody
 * had touched in an hour and one whose last answer finished days ago. Since the
 * stream emits a deterministic DONE, the only window where a refetch can find
 * anything new is while a response is in flight, so that is the only window it
 * runs in.
 */
export function useVirtualizedMessages(
  threadId: string,
  isAwaitingResponse = false,
): UseVirtualizedMessagesReturn {
  const query = useInfiniteQuery({
    queryKey: queryKeys.threads.messagesInfinite(threadId),
    queryFn: ({ pageParam }) => {
      logger.debug({
        component: 'chat',
        action: 'fetch-messages-page',
        message: `Fetching messages page ${String(pageParam)}`,
        details: { threadId, page: pageParam },
      });
      return chatRepository.getMessagesPaginated(threadId, pageParam, MESSAGES_PAGE_SIZE);
    },
    initialPageParam: 1,
    getNextPageParam: (lastPage) => {
      const { page, totalPages } = lastPage.meta;
      return page < totalPages ? page + 1 : undefined;
    },
    enabled: !!threadId,
    // `false` disables the interval entirely rather than setting a long one:
    // an idle thread should cost nothing, not less.
    refetchInterval: isAwaitingResponse ? MESSAGE_POLL_INTERVAL_MS : false,
    staleTime: 2000,
    maxPages: undefined,
  });

  // Backend returns DESC (page 1 = newest).
  // Pages in query.data.pages: [page1(newest), page2(older), page3(oldest)...]
  // We need chronological order: oldest first, newest last.
  const messages = useMemo<ChatMessage[]>(() => {
    if (!query.data) {
      return [];
    }
    const flat: ChatMessage[] = [];
    // Iterate pages in reverse (oldest page last in array → first in output)
    for (let i = query.data.pages.length - 1; i >= 0; i--) {
      const page = query.data.pages[i];
      if (page) {
        // Each page's items are DESC, reverse to ASC
        for (let j = page.data.length - 1; j >= 0; j--) {
          const msg = page.data[j];
          if (msg) {
            flat.push(msg);
          }
        }
      }
    }
    return flat;
  }, [query.data]);

  const totalCount = query.data?.pages[0]?.meta.total ?? 0;

  // Stable firstItemIndex: starts at VIRTUOSO_START_INDEX - initialCount.
  // When older messages are prepended (messages.length grows), decrement by delta
  // so Virtuoso can maintain scroll position without a visual jump.
  const [firstItemIndex, setFirstItemIndex] = useState(() =>
    Math.max(0, VIRTUOSO_START_INDEX - messages.length),
  );
  const prevLengthRef = useRef(messages.length);

  useEffect(() => {
    const newLength = messages.length;
    if (newLength > prevLengthRef.current) {
      const delta = newLength - prevLengthRef.current;
      setFirstItemIndex((prev) => Math.max(0, prev - delta));
    }
    prevLengthRef.current = newLength;
  }, [messages.length]);

  // "Fetch older" = fetch next page in the infinite query (higher page number = older messages)
  const fetchOlderMessages = useCallback((): void => {
    if (query.hasNextPage && !query.isFetchingNextPage) {
      logger.debug({
        component: 'chat',
        action: 'fetch-older-messages',
        message: 'Loading older messages',
        details: { currentPages: query.data?.pages.length },
      });
      void query.fetchNextPage();
    }
  }, [query]);

  return {
    messages,
    isLoading: query.isLoading,
    isFetchingPreviousPage: query.isFetchingNextPage,
    isFetchingNextPage: false,
    hasPreviousPage: query.hasNextPage ?? false,
    hasNextPage: false,
    fetchPreviousPage: fetchOlderMessages,
    fetchNextPage: () => {},
    totalCount,
    firstItemIndex,
  };
}
