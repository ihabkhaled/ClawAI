import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { discoveryRepository } from '@/repositories/ollama/discovery.repository';
import { queryKeys } from '@/repositories/shared/query-keys';
import type {
  DiscoveryRunListResponse,
  DiscoveryRunsQueryResult,
  DiscoveryTriggerRequest,
  RunListFilters,
  TriggerDiscoveryResult,
} from '@/types';

export function useDiscoveryRuns(filters: RunListFilters = {}): DiscoveryRunsQueryResult {
  const filterKey = filters as unknown as Record<string, unknown>;
  const query = useQuery<DiscoveryRunListResponse>({
    queryKey: queryKeys.discovery.runs.list(filterKey),
    queryFn: () => discoveryRepository.listRuns(filters),
    // Discovery lives on the optional ollama-service; stop polling once the
    // query has settled into an error so an unavailable backend isn't
    // hammered forever.
    retry: false,
    refetchInterval: (q) => {
      if (q.state.status === 'error') {
        return false;
      }
      const data = q.state.data;
      if (data === undefined) {
        return 5_000;
      }
      const hasRunning = data.data.some((r) => r.status === 'RUNNING' || r.status === 'PENDING');
      return hasRunning ? 3_000 : false;
    },
  });

  return {
    runs: query.data?.data ?? [],
    total: query.data?.total ?? 0,
    isLoading: query.isLoading,
    isError: query.isError,
  };
}

export function useTriggerDiscovery(): TriggerDiscoveryResult {
  const queryClient = useQueryClient();
  const mutation = useMutation({
    mutationFn: (data: DiscoveryTriggerRequest) => discoveryRepository.triggerRefresh(data),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.discovery.runs.all });
      void queryClient.invalidateQueries({ queryKey: queryKeys.discovery.candidates.all });
    },
  });
  return {
    mutate: mutation.mutate,
    isPending: mutation.isPending,
    error: mutation.error as Error | null,
    lastResult: mutation.data,
  };
}
