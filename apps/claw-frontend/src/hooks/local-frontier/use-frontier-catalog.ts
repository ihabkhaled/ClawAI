'use client';

import { useQuery, type UseQueryResult } from '@tanstack/react-query';

import { localFrontierRepository } from '@/repositories/local-frontier/local-frontier.repository';
import { queryKeys } from '@/repositories/shared/query-keys';
import type { FrontierCatalogFilters, FrontierCatalogList } from '@/types/local-frontier.types';

export function useFrontierCatalog(
  filters: FrontierCatalogFilters,
): UseQueryResult<FrontierCatalogList, Error> {
  return useQuery({
    queryKey: queryKeys.localFrontier.catalog(filters as Record<string, unknown>),
    queryFn: () => localFrontierRepository.listCatalog(filters),
    staleTime: 30_000,
    // Optional local runtime: a deployment without llama.cpp answers 502 on
    // every attempt, so retrying only holds dependent pages in a loading state
    // for the length of the backoff. Fail fast and degrade to cloud models.
    // retry:false alone does not stop the app-wide 10s refetchInterval default
    // (providers.tsx) from polling a permanently-502ing endpoint forever.
    retry: false,
    refetchInterval: false,
  });
}
