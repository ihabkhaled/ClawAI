import { useQuery } from '@tanstack/react-query';

import { PULL_JOB_POLL_INTERVAL_MS } from '@/constants';
import { ollamaRepository } from '@/repositories/ollama/ollama.repository';
import { queryKeys } from '@/repositories/shared/query-keys';
import { logger } from '@/utilities';

export function usePullJobs() {
  const query = useQuery({
    queryKey: queryKeys.pullJobs.all,
    queryFn: () => {
      logger.debug({
        component: 'catalog',
        action: 'fetch-pull-jobs',
        message: 'Fetching pull jobs',
      });
      return ollamaRepository.getPullJobs();
    },
    refetchInterval: PULL_JOB_POLL_INTERVAL_MS,
  });

  const jobs = query.data ?? [];
  const hasActiveJobs = jobs.some((j) => j.status === 'PENDING' || j.status === 'IN_PROGRESS');

  return {
    pullJobs: jobs,
    isLoading: query.isLoading,
    hasActiveJobs,
  };
}
