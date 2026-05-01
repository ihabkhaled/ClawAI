'use client';

import { useQuery, type UseQueryResult } from '@tanstack/react-query';

import { POLL_INTERVAL_MS } from '@/constants/local-frontier.constants';
import { localFrontierRepository } from '@/repositories/local-frontier/local-frontier.repository';
import { queryKeys } from '@/repositories/shared/query-keys';
import type { LoadedModel } from '@/types/local-frontier.types';

export function useLoadedModel(): UseQueryResult<LoadedModel | null, Error> {
  return useQuery({
    queryKey: queryKeys.localFrontier.loadedModel(),
    queryFn: () => localFrontierRepository.getLoadedModel(),
    refetchInterval: POLL_INTERVAL_MS * 5,
  });
}
