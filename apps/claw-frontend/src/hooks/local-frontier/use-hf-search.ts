'use client';

import { useInfiniteQuery } from '@tanstack/react-query';

import { localFrontierRepository } from '@/repositories/local-frontier/local-frontier.repository';
import { queryKeys } from '@/repositories/shared/query-keys';
import type { HfModelSummary, HfSearchQuery, UseHfSearchResult } from '@/types/hf-search.types';

export function useHfSearch(query: HfSearchQuery, enabled = true): UseHfSearchResult {
  const limit = query.limit ?? 20;
  const result = useInfiniteQuery({
    queryKey: queryKeys.localFrontier.hfSearch({
      q: query.q ?? '',
      sort: query.sort ?? '',
      limit,
    } as Record<string, unknown>),
    queryFn: ({ pageParam }) =>
      localFrontierRepository.searchHuggingFace({
        ...query,
        limit,
        page: pageParam,
      }),
    enabled,
    initialPageParam: 1,
    getNextPageParam: (lastPage: HfModelSummary[], allPages: HfModelSummary[][]) => {
      // The HF endpoint doesn't expose a total; treat a short page as the end.
      if (lastPage.length < limit) {
        return undefined;
      }
      return allPages.length + 1;
    },
    staleTime: 60_000,
  });

  const data = result.data?.pages.flatMap((page) => page) ?? [];

  return {
    data,
    isLoading: result.isLoading,
    isError: result.isError,
    error: result.error,
    hasNextPage: result.hasNextPage,
    isFetchingNextPage: result.isFetchingNextPage,
    fetchNextPage: () => {
      void result.fetchNextPage();
    },
  };
}
