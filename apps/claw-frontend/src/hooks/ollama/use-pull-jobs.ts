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
    // See local-frontier/use-pull-jobs.ts: stop polling once the query has
    // settled into an error so an unavailable backend isn't hammered forever.
    refetchInterval: (q) => (q.state.status === 'error' ? false : PULL_JOB_POLL_INTERVAL_MS),
    retry: false,
  });

  const jobs = query.data ?? [];
  const hasActiveJobs = jobs.some(
    (j) => j.status === 'PENDING' || j.status === 'IN_PROGRESS' || j.status === 'INSTALLING',
  );

  return {
    pullJobs: jobs,
    isLoading: query.isLoading,
    hasActiveJobs,
  };
}
