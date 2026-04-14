import { useQuery } from '@tanstack/react-query';

import { listAgentSessions } from '../../repositories/agent/agent.repository';
import { queryKeys } from '../../repositories/shared/query-keys';
import type { ListSessionsQuery } from '../../types/agent.types';

export function useAgentSessions(query?: ListSessionsQuery) {
  return useQuery({
    queryKey: queryKeys.agentSessions.list(query ?? {}),
    queryFn: () => listAgentSessions(query),
  });
}
