import { useQuery } from '@tanstack/react-query';

import { routingRepository } from '@/repositories/routing/routing.repository';
import { queryKeys } from '@/repositories/shared/query-keys';

export function useSuspiciousCases(runId: string | undefined) {
  const query = useQuery({
    queryKey: queryKeys.replay.runs.suspicious(runId ?? ''),
    queryFn: () => routingRepository.getSuspiciousCases(runId ?? ''),
    enabled: Boolean(runId),
  });

  return {
    cases: query.data ?? [],
    isLoading: query.isLoading,
    isError: query.isError,
  };
}
