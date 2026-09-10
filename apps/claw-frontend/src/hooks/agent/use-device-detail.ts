import { useQuery } from '@tanstack/react-query';

import { QUERY_POLL_LIVE_SLOW_MS } from '@/constants/query-policy.constants';

import { getDevice } from '../../repositories/agent/devices.repository';
import { queryKeys } from '../../repositories/shared/query-keys';

export function useDeviceDetail(id: string | undefined) {
  return useQuery({
    queryKey: queryKeys.devices.detail(id ?? ''),
    // Same as the list it drills into.
    refetchInterval: QUERY_POLL_LIVE_SLOW_MS,
    queryFn: () => {
      if (id === undefined) {
        throw new Error('deviceId required');
      }
      return getDevice(id);
    },
    enabled: id !== undefined,
  });
}
