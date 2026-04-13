import { useQuery } from '@tanstack/react-query';

import { routingRepository } from '@/repositories/routing/routing.repository';
import { queryKeys } from '@/repositories/shared/query-keys';

export function useReplayRuns() {
  const query = useQuery({
    queryKey: queryKeys.replay.runs.list(),
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
