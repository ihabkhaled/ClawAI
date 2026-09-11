import { useInfiniteQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { MESSAGE_POLL_INTERVAL_MS, MESSAGES_PAGE_SIZE, VIRTUOSO_START_INDEX } from '@/constants';
import { chatRepository } from '@/repositories/chat/chat.repository';
import { queryKeys } from '@/repositories/shared/query-keys';
import type { ChatMessage, UseVirtualizedMessagesReturn } from '@/types';
import { logger, mergeLatestMessagesPageIntoCache } from '@/utilities';

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
  const queryClient = useQueryClient();
  const query = useInfiniteQuery({
    queryKey: queryKeys.threads.messagesInfinite(threadId),
    // `signal` is forwarded all the way to axios so a cancelled refetch is
    // actually cancelled. Without it the request completed anyway and produced
    // a duplicate response.
    queryFn: ({ pageParam, signal }) => {
      logger.debug({
        component: 'chat',
        action: 'fetch-messages-page',
        message: `Fetching messages before ${pageParam ?? '(newest)'}`,
        details: { threadId, before: pageParam },
      });
      return chatRepository.getMessagesPaginated(threadId, pageParam, MESSAGES_PAGE_SIZE, signal);
    },
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => lastPage.meta.nextBefore ?? undefined,
    enabled: !!threadId,
    // The awaiting-response poll is NOT wired to `refetchInterval`. TanStack
    // Query refetches every currently loaded page in sequence on each
    // interval tick, so on a thread whose history had been scrolled back
    // through, each 5s tick re-pulled every page loaded so far instead of
    // just the one page a new message can land on. See the effect below.
    refetchInterval: false,
    staleTime: 2000,
    maxPages: undefined,
  });

  // While a response is in flight, page 1 is polled directly and merged into
  // the cache instead of letting `refetchInterval` refetch every loaded page.
  // A new message only ever lands on page 1 (`orderBy: createdAt desc`), so a
  // reply landing while the user has scrolled back through history no longer
  // costs one request per page loaded.
  const [isPollingNewestPage, setIsPollingNewestPage] = useState(false);
  useEffect(() => {
    if (!isAwaitingResponse || !threadId) {
      return;
    }
    const controller = new AbortController();
    let cancelled = false;
    let pollInFlight = false;
    const pollNewestPage = async (): Promise<void> => {
      if (pollInFlight) {
        return;
      }
      pollInFlight = true;
      setIsPollingNewestPage(true);
      try {
        const freshPage = await chatRepository.getMessagesPaginated(
          threadId,
          undefined,
          MESSAGES_PAGE_SIZE,
          controller.signal,
        );
        if (!cancelled) {
          mergeLatestMessagesPageIntoCache(queryClient, threadId, freshPage);
        }
      } catch {
        // A dropped poll tick is not an error the UI needs to know about —
        // the deadline in useThreadDetail is what bounds how long waiting
        // lasts, and the next tick tries again.
      } finally {
        pollInFlight = false;
        if (!cancelled) {
          setIsPollingNewestPage(false);
        }
      }
    };
    const intervalId = setInterval(() => {
      void pollNewestPage();
    }, MESSAGE_POLL_INTERVAL_MS);
    return () => {
      cancelled = true;
      controller.abort();
      clearInterval(intervalId);
    };
  }, [isAwaitingResponse, threadId, queryClient]);

  // Backend returns DESC (page 1 = newest).
  // Pages in query.data.pages: [page1(newest), page2(older), page3(oldest)...]
  // We need chronological order: oldest first, newest last.
  const messages = useMemo<ChatMessage[]>(() => {
    if (!query.data) {
      return [];
    }
    const flat: ChatMessage[] = [];
    // Cursor pagination means a fetched page's boundary is a specific
    // message's id, not a numeric offset that shifts when a row is appended
    // between two requests — so this should no longer be reachable. Kept as
    // defense-in-depth: it is a few cycles per render against a class of bug
    // (a duplicate id reaching the rendered list) that cost real debugging
    // time before the cursor migration closed its root cause.
    const seenIds = new Set<string>();
    // Iterate pages in reverse (oldest page last in array → first in output)
    for (let i = query.data.pages.length - 1; i >= 0; i--) {
      const page = query.data.pages[i];
      if (page) {
        // Each page's items are DESC, reverse to ASC
        for (let j = page.data.length - 1; j >= 0; j--) {
          const msg = page.data[j];
          if (msg && !seenIds.has(msg.id)) {
            seenIds.add(msg.id);
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
    isFetching: query.isFetching || isPollingNewestPage,
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
