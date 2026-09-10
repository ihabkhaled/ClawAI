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
    // refresh (useRefreshHardware) is the only intended way to re-fetch.
    // The `refetchInterval: false` below is now the default and is kept as a
    // statement of intent: this endpoint is never polled. It used to be load-
    // bearing, because a global 10s interval polled every query in the app.
    refetchInterval: false,
    retry: false,
  });
}
