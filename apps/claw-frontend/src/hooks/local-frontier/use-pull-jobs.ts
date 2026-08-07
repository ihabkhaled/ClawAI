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
    // See use-loaded-model.ts: do not poll an absent optional runtime forever.
    refetchInterval: (query) => (query.state.status === 'error' ? false : POLL_INTERVAL_MS),
    retry: false,
  });
}
