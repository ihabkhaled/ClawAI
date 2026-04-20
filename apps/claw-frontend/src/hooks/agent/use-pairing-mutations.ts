import { useMutation, useQueryClient } from '@tanstack/react-query';

import { approvePairing, denyPairing } from '../../repositories/agent/pairing.repository';
import { queryKeys } from '../../repositories/shared/query-keys';
import type { ApprovePairingRequest } from '../../types/agent.types';

export function useApprovePairing() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (dto: ApprovePairingRequest) => approvePairing(dto),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: queryKeys.devices.all });
    },
  });
}

export function useDenyPairing() {
  return useMutation({
    mutationFn: (pairingCode: string) => denyPairing({ pairingCode }),
  });
}
