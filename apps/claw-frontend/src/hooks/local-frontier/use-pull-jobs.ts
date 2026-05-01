'use client';

import { useQuery, type UseQueryResult } from '@tanstack/react-query';

import { POLL_INTERVAL_MS } from '@/constants/local-frontier.constants';
import { localFrontierRepository } from '@/repositories/local-frontier/local-frontier.repository';
import { queryKeys } from '@/repositories/shared/query-keys';
import type { PullJob } from '@/types/local-frontier.types';

export function usePullJobs(): UseQueryResult<{ rows: PullJob[]; total: number }, Error> {
  return useQuery({
    queryKey: queryKeys.localFrontier.pullJobs(),
    queryFn: () => localFrontierRepository.listPullJobs(),
    refetchInterval: POLL_INTERVAL_MS,
  });
}
