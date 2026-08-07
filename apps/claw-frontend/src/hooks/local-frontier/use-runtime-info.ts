'use client';

import { useQuery, type UseQueryResult } from '@tanstack/react-query';

import { localFrontierRepository } from '@/repositories/local-frontier/local-frontier.repository';
import { queryKeys } from '@/repositories/shared/query-keys';
import type { RuntimeInfo } from '@/types/local-frontier.types';

export function useRuntimeInfo(): UseQueryResult<RuntimeInfo, Error> {
  return useQuery({
    queryKey: queryKeys.localFrontier.runtimeInfo(),
    queryFn: () => localFrontierRepository.getRuntimeInfo(),
    staleTime: 60_000,
    // See use-frontier-catalog.ts: optional runtime, fail fast.
    retry: false,
  });
}
