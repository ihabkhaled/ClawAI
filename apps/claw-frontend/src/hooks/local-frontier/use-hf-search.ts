'use client';

import { useQuery, type UseQueryResult } from '@tanstack/react-query';

import { localFrontierRepository } from '@/repositories/local-frontier/local-frontier.repository';
import { queryKeys } from '@/repositories/shared/query-keys';
import type { HfModelSummary, HfSearchQuery } from '@/types/hf-search.types';

export function useHfSearch(
  query: HfSearchQuery,
  enabled = true,
): UseQueryResult<HfModelSummary[], Error> {
  return useQuery({
    queryKey: queryKeys.localFrontier.hfSearch(query as Record<string, unknown>),
    queryFn: () => localFrontierRepository.searchHuggingFace(query),
    enabled,
    staleTime: 60_000,
  });
}
