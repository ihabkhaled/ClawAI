import { useInfiniteQuery } from '@tanstack/react-query';
import { useCallback, useMemo } from 'react';

import { THREADS_PAGE_SIZE } from '@/constants';
import { chatRepository } from '@/repositories/chat/chat.repository';
import { queryKeys } from '@/repositories/shared/query-keys';
import type { ChatThread, UseVirtualizedThreadsReturn } from '@/types';
import { logger } from '@/utilities';

type UseVirtualizedThreadsParams = {
  search?: string;
  showArchived?: boolean;
};

export function useVirtualizedThreads(
  params?: UseVirtualizedThreadsParams,
): UseVirtualizedThreadsReturn {
  const searchParam = params?.search ?? '';

  const filterParams = useMemo<Record<string, string>>(() => {
    const result: Record<string, string> = {};
    if (searchParam) {
      result['search'] = searchParam;
    }
    return result;
  }, [searchParam]);

  const filterKey = useMemo<Record<string, unknown>>(
    () => ({ search: searchParam }),
    [searchParam],
  );

  const query = useInfiniteQuery({
    queryKey: queryKeys.threads.listInfinite(filterKey),
    queryFn: ({ pageParam }) => {
      logger.debug({ component: 'chat', action: 'fetch-threads-page', message: 'Fetching threads page', details: { page: pageParam, search: searchParam } });
      return chatRepository.getThreadsPaginated(pageParam, THREADS_PAGE_SIZE, filterParams);
    },
    initialPageParam: 1,
    getNextPageParam: (lastPage) => {
      const { page, totalPages } = lastPage.meta;
      return page < totalPages ? page + 1 : undefined;
    },
  });

  const threads = useMemo<ChatThread[]>(() => {
    if (!query.data) {
      return [];
    }
    return query.data.pages.flatMap((page) => page.data);
  }, [query.data]);

  const totalCount = query.data?.pages[0]?.meta.total ?? 0;

  const fetchNextPage = useCallback((): void => {
    if (query.hasNextPage && !query.isFetchingNextPage) {
      void query.fetchNextPage();
    }
  }, [query]);

  return {
    threads,
    isLoading: query.isLoading,
    isFetchingNextPage: query.isFetchingNextPage,
    hasNextPage: query.hasNextPage,
    fetchNextPage,
    totalCount,
  };
}
