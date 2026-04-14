import { useQuery } from '@tanstack/react-query';

import { listCommands } from '../../repositories/agent/agent.repository';
import { queryKeys } from '../../repositories/shared/query-keys';
import type { ListCommandsQuery } from '../../types/agent.types';

export function useAgentCommands(query?: ListCommandsQuery) {
  return useQuery({
    queryKey: queryKeys.agentCommands.list(query ?? {}),
    queryFn: () => listCommands(query),
    refetchInterval: 5000,
  });
}
