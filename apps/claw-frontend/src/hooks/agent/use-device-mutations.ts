import { useMutation, useQueryClient } from '@tanstack/react-query';

import { revokeDevice, updateDevice } from '../../repositories/agent/devices.repository';
import { queryKeys } from '../../repositories/shared/query-keys';
import type { RevokeDeviceRequest, UpdateDeviceRequest } from '../../types/agent.types';

export function useUpdateDevice() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (vars: { id: string; dto: UpdateDeviceRequest }) => updateDevice(vars.id, vars.dto),
    onSuccess: (data) => {
      void qc.invalidateQueries({ queryKey: queryKeys.devices.all });
      void qc.invalidateQueries({ queryKey: queryKeys.devices.detail(data.id) });
    },
  });
}

export function useRevokeDevice() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (vars: { id: string; dto: RevokeDeviceRequest }) => revokeDevice(vars.id, vars.dto),
    onSuccess: (data) => {
      void qc.invalidateQueries({ queryKey: queryKeys.devices.all });
      void qc.invalidateQueries({ queryKey: queryKeys.devices.detail(data.id) });
    },
  });
}
