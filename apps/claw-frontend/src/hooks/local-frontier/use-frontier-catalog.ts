'use client';

import { useQuery, type UseQueryResult } from '@tanstack/react-query';

import { localFrontierRepository } from '@/repositories/local-frontier/local-frontier.repository';
import { queryKeys } from '@/repositories/shared/query-keys';
import type {
  FrontierCatalogFilters,
  FrontierCatalogList,
} from '@/types/local-frontier.types';

export function useFrontierCatalog(
  filters: FrontierCatalogFilters,
): UseQueryResult<FrontierCatalogList, Error> {
  return useQuery({
    queryKey: queryKeys.localFrontier.catalog(filters as Record<string, unknown>),
    queryFn: () => localFrontierRepository.listCatalog(filters),
    staleTime: 30_000,
  });
}
