import { apiClient } from '../../services/shared/api-client';
import type {
  GrantConnectorAccessRequest,
  SharedConnectorView,
  WorkspaceConnectorGrant,
} from '../../types/connector-grant.types';

const base = (connectorId: string): string =>
  `/workspace/connectors/${encodeURIComponent(connectorId)}/grants`;

export async function listConnectorsSharedWithMe(): Promise<SharedConnectorView[]> {
  const response = await apiClient.get<SharedConnectorView[]>(
    '/workspace/connectors/shared-with-me',
  );
  return response.data;
}

export async function listConnectorGrants(connectorId: string): Promise<WorkspaceConnectorGrant[]> {
  const response = await apiClient.get<WorkspaceConnectorGrant[]>(base(connectorId));
  return response.data;
}

export async function grantConnectorAccess(
  connectorId: string,
  payload: GrantConnectorAccessRequest,
): Promise<WorkspaceConnectorGrant> {
  const response = await apiClient.post<WorkspaceConnectorGrant>(base(connectorId), payload);
  return response.data;
}

export async function revokeConnectorAccess(
  connectorId: string,
  granteeUserId: string,
): Promise<void> {
  await apiClient.delete(`${base(connectorId)}/${encodeURIComponent(granteeUserId)}`);
}
