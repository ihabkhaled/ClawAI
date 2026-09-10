import { useQuery } from '@tanstack/react-query';

import { QUERY_POLL_LIVE_SLOW_MS } from '@/constants/query-policy.constants';

import { listRepos } from '../../repositories/agent/agent.repository';
import { queryKeys } from '../../repositories/shared/query-keys';
import type { ListReposQuery } from '../../types/agent.types';

export function useAgentRepos(query?: ListReposQuery) {
  return useQuery({
    queryKey: queryKeys.agentRepos.list(query ?? {}),
    // Repo sync state is written by the agent daemon.
    refetchInterval: QUERY_POLL_LIVE_SLOW_MS,
    queryFn: () => listRepos(query),
  });
}
