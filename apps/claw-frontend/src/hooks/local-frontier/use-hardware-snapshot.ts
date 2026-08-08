'use client';

import { useQuery, type UseQueryResult } from '@tanstack/react-query';

import { localFrontierRepository } from '@/repositories/local-frontier/local-frontier.repository';
import { queryKeys } from '@/repositories/shared/query-keys';
import type { HardwareSnapshot } from '@/types/local-frontier.types';

export function useHardwareSnapshot(): UseQueryResult<HardwareSnapshot, Error> {
  return useQuery({
    queryKey: queryKeys.localFrontier.hardware(),
    queryFn: () => localFrontierRepository.getHardware(),
    staleTime: 60_000,
    // See use-frontier-catalog.ts: optional runtime, fail fast. A manual
    // refresh (useRefreshHardware) is the only intended way to re-fetch —
    // without an explicit `false` here this would inherit the global 10s
    // refetchInterval default and poll an absent runtime forever.
    refetchInterval: false,
    retry: false,
  });
}
