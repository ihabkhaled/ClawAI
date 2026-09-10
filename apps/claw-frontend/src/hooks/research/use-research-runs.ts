import { useQuery } from '@tanstack/react-query';

import { QUERY_POLL_LIVE_MS } from '@/constants/query-policy.constants';
import { researchRepository } from '@/repositories/research/research.repository';
import { queryKeys } from '@/repositories/shared/query-keys';
import type { ResearchRun } from '@/types';

export function useResearchRuns(limit = 20): {
  runs: ResearchRun[];
  isLoading: boolean;
  isError: boolean;
} {
  const query = useQuery({
    queryKey: queryKeys.researchRuns.list(limit),
    // Run status advances RUNNING to COMPLETED on its own.
    refetchInterval: QUERY_POLL_LIVE_MS,
    queryFn: () => researchRepository.listRuns(limit),
    staleTime: 10_000,
  });
  return {
    runs: query.data ?? [],
    isLoading: query.isLoading,
    isError: query.isError,
  };
}

export function useResearchRun(id: string): {
  run: ResearchRun | undefined;
  isLoading: boolean;
  isError: boolean;
} {
  const query = useQuery({
    queryKey: queryKeys.researchRuns.detail(id),
    // Same, for the run being watched.
    refetchInterval: QUERY_POLL_LIVE_MS,
    queryFn: () => researchRepository.getRun(id),
    enabled: id.length > 0,
  });
  return {
    run: query.data,
    isLoading: query.isLoading,
    isError: query.isError,
  };
}
