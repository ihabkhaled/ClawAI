import { useInfiniteQuery } from '@tanstack/react-query';
import { useCallback, useMemo } from 'react';

import { useTranslation } from '@/lib/i18n';
import { liveRepository } from '@/repositories/live/live.repository';
import { queryKeys } from '@/repositories/shared/query-keys';
import type { UseLiveHistoryDetailResult } from '@/types/live.types';
import { liveHistoryEventToCard } from '@/utilities/live-feed-store.utility';

/** The feed of one past session, limited server-side to the user's own coverage. */
export function useLiveHistoryDetail(sessionId: string | null): UseLiveHistoryDetailResult {
  const { t, locale } = useTranslation();
  const query = useInfiniteQuery({
    queryKey: queryKeys.live.historyEvents(sessionId ?? ''),
    queryFn: ({ pageParam, signal }) =>
      liveRepository.listHistoryEvents(sessionId ?? '', pageParam, { signal }),
    initialPageParam: null as string | null,
    getNextPageParam: (last) => last.nextCursor ?? undefined,
    enabled: sessionId !== null,
  });
  const events = useMemo(
    () => query.data?.pages.flatMap((page) => page.items.map(liveHistoryEventToCard)) ?? [],
    [query.data],
  );
  const { fetchNextPage } = query;
  const loadMore = useCallback((): void => void fetchNextPage(), [fetchNextPage]);

  return {
    t,
    locale,
    events,
    isLoading: query.isLoading,
    isError: query.isError,
    hasMore: query.hasNextPage,
    loadMore,
  };
}
