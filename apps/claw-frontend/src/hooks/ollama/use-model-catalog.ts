import { useQuery } from '@tanstack/react-query';

import { ollamaRepository } from '@/repositories/ollama/ollama.repository';
import { queryKeys } from '@/repositories/shared/query-keys';
import type { CatalogFilterParams } from '@/types';
import { logger } from '@/utilities';

export function useModelCatalog(params: CatalogFilterParams) {
  const queryParams: Record<string, string> = {};
  if (params.category) {
    queryParams['category'] = params.category;
  }
  if (params.search) {
    queryParams['search'] = params.search;
  }
  if (params.page) {
    queryParams['page'] = String(params.page);
  }
  if (params.limit) {
    queryParams['limit'] = String(params.limit);
  }

  const query = useQuery({
    queryKey: queryKeys.catalog.list(params as Record<string, unknown>),
    queryFn: () => {
      logger.debug({
        component: 'catalog',
        action: 'fetch-catalog',
        message: 'Fetching model catalog',
      });
      return ollamaRepository.getCatalog(queryParams);
    },
  });

  return {
    entries: query.data?.data ?? [],
    meta: query.data?.meta ?? { total: 0, page: 1, limit: 20, totalPages: 0 },
    isLoading: query.isLoading,
    isError: query.isError,
  };
}
