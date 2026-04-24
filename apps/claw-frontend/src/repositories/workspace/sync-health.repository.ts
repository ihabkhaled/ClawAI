import { apiClient } from '../../services/shared/api-client';
import type {
  PauseConnectorRequest,
  SyncHealthDashboard,
  UpdateCadenceRequest,
} from '../../types/workspace-sync.types';
import type { WorkspaceConnector } from '../../types/workspace.types';

const BASE = '/workspace';

export async function getSyncHealthDashboard(): Promise<SyncHealthDashboard> {
  const response = await apiClient.get<SyncHealthDashboard>(`${BASE}/sync/dashboard`);
  return response.data;
}

export async function updateConnectorCadence(
  connectorId: string,
  request: UpdateCadenceRequest,
): Promise<WorkspaceConnector> {
  const response = await apiClient.patch<WorkspaceConnector>(
    `${BASE}/connectors/${connectorId}/cadence`,
    request,
  );
  return response.data;
}

export async function pauseConnector(
  connectorId: string,
  request: PauseConnectorRequest = {},
): Promise<WorkspaceConnector> {
  const response = await apiClient.post<WorkspaceConnector>(
    `${BASE}/connectors/${connectorId}/pause`,
    request,
  );
  return response.data;
}

export async function resumeConnector(connectorId: string): Promise<WorkspaceConnector> {
  const response = await apiClient.post<WorkspaceConnector>(
    `${BASE}/connectors/${connectorId}/resume`,
    {},
  );
  return response.data;
}
