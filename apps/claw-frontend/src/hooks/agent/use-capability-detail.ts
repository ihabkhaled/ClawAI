import { useQuery } from '@tanstack/react-query';

import { getCapability } from '../../repositories/agent/capability.repository';
import { queryKeys } from '../../repositories/shared/query-keys';

export function useCapabilityDetail(id: string | null) {
  return useQuery({
    queryKey: queryKeys.agentCapabilities.detail(id ?? ''),
    queryFn: () => (id === null ? Promise.reject(new Error('id required')) : getCapability(id)),
    enabled: id !== null,
  });
}
