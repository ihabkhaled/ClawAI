import {
  useMutation,
  useQuery,
  useQueryClient,
  type UseMutationResult,
  type UseQueryResult,
} from '@tanstack/react-query';

import { queryKeys } from '@/repositories/shared/query-keys';
import {
  grantConnectorAccess,
  listConnectorGrants,
  revokeConnectorAccess,
} from '@/repositories/workspace/connector-grant.repository';
import type {
  GrantConnectorAccessRequest,
  WorkspaceConnectorGrant,
} from '@/types/connector-grant.types';

export function useConnectorGrantsQuery(
  connectorId: string,
  options: { enabled?: boolean } = {},
): UseQueryResult<WorkspaceConnectorGrant[], Error> {
  return useQuery({
    queryKey: queryKeys.connectorGrants.list(connectorId),
    queryFn: () => listConnectorGrants(connectorId),
    enabled: options.enabled ?? true,
    staleTime: 30_000,
  });
}

export function useGrantConnectorAccess(
  connectorId: string,
): UseMutationResult<WorkspaceConnectorGrant, Error, GrantConnectorAccessRequest> {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (payload) => grantConnectorAccess(connectorId, payload),
    onSuccess: async () => {
      await client.invalidateQueries({ queryKey: queryKeys.connectorGrants.list(connectorId) });
    },
  });
}

export function useRevokeConnectorAccess(
  connectorId: string,
): UseMutationResult<void, Error, string> {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (granteeUserId) => revokeConnectorAccess(connectorId, granteeUserId),
    onSuccess: async () => {
      await client.invalidateQueries({ queryKey: queryKeys.connectorGrants.list(connectorId) });
    },
  });
}
