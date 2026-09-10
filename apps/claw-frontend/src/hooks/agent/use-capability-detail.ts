import { useQuery } from '@tanstack/react-query';

import { QUERY_POLL_LIVE_MS } from '@/constants/query-policy.constants';

import { getCapability } from '../../repositories/agent/capability.repository';
import { queryKeys } from '../../repositories/shared/query-keys';

export function useCapabilityDetail(id: string | null) {
  return useQuery({
    queryKey: queryKeys.agentCapabilities.detail(id ?? ''),
    // The queue polls; without this the detail view never leaves PENDING.
    refetchInterval: QUERY_POLL_LIVE_MS,
    queryFn: () => (id === null ? Promise.reject(new Error('id required')) : getCapability(id)),
    enabled: id !== null,
  });
}
