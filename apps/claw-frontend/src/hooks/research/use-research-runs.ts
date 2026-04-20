import { useQuery } from '@tanstack/react-query';

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
    queryFn: () => researchRepository.getRun(id),
    enabled: id.length > 0,
  });
  return {
    run: query.data,
    isLoading: query.isLoading,
    isError: query.isError,
  };
}
