import { useInfiniteQuery } from '@tanstack/react-query';
import { useCallback, useMemo } from 'react';

import { liveRepository } from '@/repositories/live/live.repository';
import { queryKeys } from '@/repositories/shared/query-keys';
import type { UseLiveHistoryResult } from '@/types/live.types';

/** The user's live sessions, newest first, by cursor (`GET /live/history?cursor=`). */
export function useLiveHistory(): UseLiveHistoryResult {
  const query = useInfiniteQuery({
    queryKey: queryKeys.live.history(),
    queryFn: ({ pageParam, signal }) => liveRepository.listHistory(pageParam, { signal }),
    initialPageParam: null as string | null,
    getNextPageParam: (last) => last.nextCursor ?? undefined,
  });
  const items = useMemo(() => query.data?.pages.flatMap((page) => page.items) ?? [], [query.data]);
  const { fetchNextPage, refetch } = query;
  const loadMore = useCallback((): void => void fetchNextPage(), [fetchNextPage]);
  const retry = useCallback((): void => void refetch(), [refetch]);

  return {
    items,
    isLoading: query.isLoading,
    isError: query.isError,
    hasMore: query.hasNextPage,
    isLoadingMore: query.isFetchingNextPage,
    loadMore,
    retry,
  };
}
