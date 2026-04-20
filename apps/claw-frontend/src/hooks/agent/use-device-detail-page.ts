import type { MutationStatus } from '../../enums';
import type { UseDeviceDetailPageResult } from '../../types/device-hook.types';

import { useDeviceDetail } from './use-device-detail';
import { useRevokeDevice, useUpdateDevice } from './use-device-mutations';

export function useDeviceDetailPage(deviceId: string | undefined): UseDeviceDetailPageResult {
  const query = useDeviceDetail(deviceId);
  const revokeMutation = useRevokeDevice();
  const updateMutation = useUpdateDevice();
  const revoke = async (): Promise<void> => {
    if (deviceId === undefined) {
      return;
    }
    await revokeMutation.mutateAsync({ id: deviceId, dto: { reason: 'user_revoke' } });
  };
  const rename = async (name: string): Promise<void> => {
    if (deviceId === undefined) {
      return;
    }
    await updateMutation.mutateAsync({ id: deviceId, dto: { name } });
  };
  return {
    device: query.data ?? null,
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
    revoke,
    rename,
    revokeStatus: revokeMutation.status as MutationStatus,
    renameStatus: updateMutation.status as MutationStatus,
  };
}
