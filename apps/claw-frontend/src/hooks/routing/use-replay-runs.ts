import { useQuery } from '@tanstack/react-query';

import { QUERY_POLL_LIVE_MS } from '@/constants/query-policy.constants';
import { routingRepository } from '@/repositories/routing/routing.repository';
import { queryKeys } from '@/repositories/shared/query-keys';

export function useReplayRuns() {
  const query = useQuery({
    queryKey: queryKeys.replay.runs.list(),
    // Replay run status advances server-side.
    refetchInterval: QUERY_POLL_LIVE_MS,
    queryFn: () => routingRepository.getReplayRuns(),
  });

  return {
    runs: query.data?.data ?? [],
    total: query.data?.meta.total ?? 0,
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
  };
}
