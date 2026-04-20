import { useSearchParams } from 'next/navigation';
import { useState } from 'react';

import { DEFAULT_CONNECT_SCOPES } from '../../constants/device.constants';
import type { MutationStatus, DeviceScope } from '../../enums';
import type { UseConnectDevicePageResult } from '../../types/device-hook.types';

import { useApprovePairing, useDenyPairing } from './use-pairing-mutations';

export function useConnectDevicePage(): UseConnectDevicePageResult {
  const params = useSearchParams();
  const pairingCode = params.get('pairingCode') ?? null;
  const [deviceName, setDeviceName] = useState<string>('');
  const [selectedScopes, setSelectedScopes] = useState<DeviceScope[]>(DEFAULT_CONNECT_SCOPES);
  const approveMutation = useApprovePairing();
  const denyMutation = useDenyPairing();
  const approve = async (): Promise<void> => {
    if (pairingCode === null) {
      return;
    }
    await approveMutation.mutateAsync({
      pairingCode,
      scopes: selectedScopes,
      deviceName: deviceName.trim().length > 0 ? deviceName.trim() : undefined,
    });
  };
  const deny = async (): Promise<void> => {
    if (pairingCode === null) {
      return;
    }
    await denyMutation.mutateAsync(pairingCode);
  };
  return {
    pairingCode,
    deviceName,
    setDeviceName,
    selectedScopes,
    setSelectedScopes,
    approve,
    deny,
    approveStatus: approveMutation.status as MutationStatus,
    approveError: approveMutation.error,
    denyStatus: denyMutation.status as MutationStatus,
    approvedDeviceId: approveMutation.data?.deviceId ?? null,
  };
}
