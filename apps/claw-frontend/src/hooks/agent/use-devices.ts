import { useQuery } from '@tanstack/react-query';

import { listDevices } from '../../repositories/agent/devices.repository';
import { queryKeys } from '../../repositories/shared/query-keys';
import type { ListDevicesQuery } from '../../types/agent.types';

export function useDevices(query?: ListDevicesQuery) {
  return useQuery({
    queryKey: queryKeys.devices.list(query ?? {}),
    queryFn: () => listDevices(query),
  });
}
