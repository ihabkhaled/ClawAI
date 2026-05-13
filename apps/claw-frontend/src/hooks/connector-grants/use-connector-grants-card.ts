import { useCallback, useState } from 'react';

import { WorkspaceConnectorAccessLevel } from '@/enums/workspace-connector-access-level.enum';
import type { UseConnectorGrantsCardResult } from '@/types/connector-grants-card.types';

import {
  useConnectorGrantsQuery,
  useGrantConnectorAccess,
  useRevokeConnectorAccess,
} from './use-connector-grants';

export function useConnectorGrantsCard(connectorId: string): UseConnectorGrantsCardResult {
  const query = useConnectorGrantsQuery(connectorId, { enabled: connectorId.length > 0 });
  const grantMut = useGrantConnectorAccess(connectorId);
  const revokeMut = useRevokeConnectorAccess(connectorId);

  const [granteeUserId, setGranteeUserId] = useState<string>('');
  const [accessLevel, setAccessLevel] = useState<WorkspaceConnectorAccessLevel>(
    WorkspaceConnectorAccessLevel.AI_ACTIONS,
  );
  const [pendingGranteeId, setPendingGranteeId] = useState<string | null>(null);

  const submitGrant = useCallback(async (): Promise<void> => {
    if (granteeUserId.trim().length === 0) {
      return;
    }
    await grantMut.mutateAsync({ granteeUserId: granteeUserId.trim(), accessLevel });
    setGranteeUserId('');
  }, [granteeUserId, accessLevel, grantMut]);

  const revoke = useCallback(
    async (id: string): Promise<void> => {
      setPendingGranteeId(id);
      try {
        await revokeMut.mutateAsync(id);
      } finally {
        setPendingGranteeId(null);
      }
    },
    [revokeMut],
  );

  return {
    grants: query.data ?? [],
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,

    granteeUserId,
    setGranteeUserId,
    accessLevel,
    setAccessLevel,

    submitGrant,
    revoke,

    isGranting: grantMut.isPending,
    isRevoking: revokeMut.isPending,
    pendingGranteeId,
    mutationError: grantMut.error ?? revokeMut.error,
  };
}
