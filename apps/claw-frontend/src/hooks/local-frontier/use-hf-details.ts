'use client';

import { useQuery, type UseQueryResult } from '@tanstack/react-query';

import { localFrontierRepository } from '@/repositories/local-frontier/local-frontier.repository';
import { queryKeys } from '@/repositories/shared/query-keys';
import type { HfModelDetails } from '@/types/hf-search.types';

export function useHfDetails(
  repo: string | null,
): UseQueryResult<HfModelDetails, Error> {
  return useQuery({
    queryKey: queryKeys.localFrontier.hfDetails(repo ?? ''),
    queryFn: () => localFrontierRepository.getHuggingFaceDetails(repo ?? ''),
    enabled: Boolean(repo),
    staleTime: 5 * 60_000,
  });
}
