import { useQuery } from '@tanstack/react-query';

import { QUERY_POLL_LIVE_MS } from '@/constants/query-policy.constants';

import { listAgentSessions } from '../../repositories/agent/agent.repository';
import { queryKeys } from '../../repositories/shared/query-keys';
import type { ListSessionsQuery } from '../../types/agent.types';

export function useAgentSessions(query?: ListSessionsQuery) {
  return useQuery({
    queryKey: queryKeys.agentSessions.list(query ?? {}),
    // Remote devices open and close sessions on their own.
    refetchInterval: QUERY_POLL_LIVE_MS,
    queryFn: () => listAgentSessions(query),
  });
}
