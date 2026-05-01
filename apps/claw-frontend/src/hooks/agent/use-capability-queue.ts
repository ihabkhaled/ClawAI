import { useQuery } from '@tanstack/react-query';

import { listCapabilities } from '../../repositories/agent/capability.repository';
import { queryKeys } from '../../repositories/shared/query-keys';
import type { ListCapabilitiesQuery } from '../../types/capability.types';

export function useCapabilityQueue(query?: ListCapabilitiesQuery) {
  return useQuery({
    queryKey: queryKeys.agentCapabilities.list(query ?? {}),
    queryFn: () => listCapabilities(query),
    refetchInterval: 5000,
  });
}
