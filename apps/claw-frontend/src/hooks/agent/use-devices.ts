import { useQuery } from '@tanstack/react-query';

import { QUERY_POLL_LIVE_SLOW_MS } from '@/constants/query-policy.constants';

import { listDevices } from '../../repositories/agent/devices.repository';
import { queryKeys } from '../../repositories/shared/query-keys';
import type { ListDevicesQuery } from '../../types/agent.types';

export function useDevices(query?: ListDevicesQuery) {
  return useQuery({
    queryKey: queryKeys.devices.list(query ?? {}),
    // Devices go offline without telling this tab.
    refetchInterval: QUERY_POLL_LIVE_SLOW_MS,
    queryFn: () => listDevices(query),
  });
}
