'use client';

import { useQuery, type UseQueryResult } from '@tanstack/react-query';

import { OPTIONAL_PROVIDERS } from '@/constants/optional-provider-gate.constants';
import { localFrontierRepository } from '@/repositories/local-frontier/local-frontier.repository';
import { queryKeys } from '@/repositories/shared/query-keys';
import type { FrontierCatalogFilters, FrontierCatalogList } from '@/types/local-frontier.types';
import { throughOptionalProvider } from '@/utilities/optional-provider-gate.utility';

export function useFrontierCatalog(
  filters: FrontierCatalogFilters,
): UseQueryResult<FrontierCatalogList, Error> {
  return useQuery({
    queryKey: queryKeys.localFrontier.catalog(filters as Record<string, unknown>),
    queryFn: () =>
      throughOptionalProvider(OPTIONAL_PROVIDERS.llamacpp, () =>
        localFrontierRepository.listCatalog(filters),
      ),
    staleTime: 30_000,
    // Optional local runtime: a deployment without llama.cpp answers 502 on
    // every attempt, so retrying only holds dependent pages in a loading state
    // for the length of the backoff. Fail fast and degrade to cloud models.
    // The `refetchInterval: false` below is now the default and is kept as a
    // statement of intent: this endpoint is never polled. It used to be load-
    // bearing, because a global 10s interval polled every query in the app.
    retry: false,
    refetchInterval: false,
  });
}
