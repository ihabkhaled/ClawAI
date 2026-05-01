'use client';

import { useQuery, type UseQueryResult } from '@tanstack/react-query';

import { localFrontierRepository } from '@/repositories/local-frontier/local-frontier.repository';
import { queryKeys } from '@/repositories/shared/query-keys';
import type { FrontierCatalogEntry } from '@/types/local-frontier.types';

export function useFrontierModel(id: string): UseQueryResult<FrontierCatalogEntry, Error> {
  return useQuery({
    queryKey: queryKeys.localFrontier.catalogEntry(id),
    queryFn: () => localFrontierRepository.getCatalogEntry(id),
    enabled: id.length > 0,
  });
}
