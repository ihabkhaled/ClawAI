import { useQuery } from '@tanstack/react-query';

import { getDevice } from '../../repositories/agent/devices.repository';
import { queryKeys } from '../../repositories/shared/query-keys';

export function useDeviceDetail(id: string | undefined) {
  return useQuery({
    queryKey: queryKeys.devices.detail(id ?? ''),
    queryFn: () => {
      if (id === undefined) {
        throw new Error('deviceId required');
      }
      return getDevice(id);
    },
    enabled: id !== undefined,
  });
}
