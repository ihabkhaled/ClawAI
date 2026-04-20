import type { MutationStatus } from '../../enums';
import type { UseDevicesPageResult } from '../../types/device-hook.types';

import { useRevokeDevice } from './use-device-mutations';
import { useDevices } from './use-devices';

export function useDevicesPage(): UseDevicesPageResult {
  const query = useDevices({ page: 1, pageSize: 50 });
  const revokeMutation = useRevokeDevice();
  const revoke = async (id: string): Promise<void> => {
    await revokeMutation.mutateAsync({ id, dto: { reason: 'user_revoke' } });
  };
  return {
    devices: query.data?.data ?? [],
    total: query.data?.total ?? 0,
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
    revoke,
    revokeStatus: revokeMutation.status as MutationStatus,
    revokingId: revokeMutation.isPending ? (revokeMutation.variables?.id ?? null) : null,
  };
}
