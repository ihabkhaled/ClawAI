import { useQuery } from '@tanstack/react-query';

import { listRepos } from '../../repositories/agent/agent.repository';
import { queryKeys } from '../../repositories/shared/query-keys';
import type { ListReposQuery } from '../../types/agent.types';

export function useAgentRepos(query?: ListReposQuery) {
  return useQuery({
    queryKey: queryKeys.agentRepos.list(query ?? {}),
    queryFn: () => listRepos(query),
  });
}
