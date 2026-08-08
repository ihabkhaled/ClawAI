import { useInfiniteQuery } from '@tanstack/react-query';

import { CATALOG_PAGE_SIZE } from '@/constants';
import { ollamaRepository } from '@/repositories/ollama/ollama.repository';
import { queryKeys } from '@/repositories/shared/query-keys';
import type { CatalogFilterParams } from '@/types';
import { logger } from '@/utilities';

export function useModelCatalog(params: CatalogFilterParams) {
  const filters: Record<string, unknown> = {};
  if (params.category) {
    filters['category'] = params.category;
  }
  if (params.runtime) {
    filters['runtime'] = params.runtime;
  }
  if (params.downloadStatus) {
    filters['downloadStatus'] = params.downloadStatus;
  }
  if (params.search) {
    filters['search'] = params.search;
  }
  if (params.capability) {
    filters['capability'] = params.capability;
  }

  const query = useInfiniteQuery({
    queryKey: queryKeys.catalog.listInfinite(filters),
    queryFn: ({ pageParam }) => {
      const queryParams: Record<string, string> = {};
      if (params.category) {
        queryParams['category'] = params.category;
      }
      if (params.runtime) {
        queryParams['runtime'] = params.runtime;
      }
      if (params.downloadStatus) {
        queryParams['downloadStatus'] = params.downloadStatus;
      }
      if (params.search) {
        queryParams['search'] = params.search;
      }
      if (params.capability) {
        queryParams['capability'] = params.capability;
      }
      queryParams['page'] = String(pageParam);
      queryParams['limit'] = String(CATALOG_PAGE_SIZE);

      logger.debug({
        component: 'catalog',
        action: 'fetch-catalog',
        message: `Fetching model catalog page ${String(pageParam)}`,
      });
      return ollamaRepository.getCatalog(queryParams);
    },
    initialPageParam: 1,
    getNextPageParam: (lastPage) => {
      if (lastPage.meta.page < lastPage.meta.totalPages) {
        return lastPage.meta.page + 1;
      }
      return undefined;
    },
    // Ollama is an OPTIONAL local runtime; a deployment without it answers 502
    // on every call. Without these, the app-wide 10s refetchInterval default
    // (providers.tsx) polls a permanently-502ing endpoint forever.
    retry: false,
    refetchInterval: false,
  });

  const entries = query.data?.pages.flatMap((p) => p.data) ?? [];
  const lastMeta = query.data?.pages.at(-1)?.meta;

  return {
    entries,
    meta: lastMeta ?? { total: 0, page: 1, limit: CATALOG_PAGE_SIZE, totalPages: 0 },
    isLoading: query.isLoading,
    isError: query.isError,
    fetchNextPage: query.fetchNextPage,
    hasNextPage: query.hasNextPage,
    isFetchingNextPage: query.isFetchingNextPage,
  };
}
