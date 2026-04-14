import { apiClient } from '../../services/shared/api-client';
import type {
  CreateWorkspaceActionRequest,
  CreateWorkspaceConnectorRequest,
  ListWorkspaceActionsQuery,
  ListWorkspaceConnectorsQuery,
  ListWorkspaceObjectsQuery,
  OAuthInitRequest,
  OAuthInitResult,
  PaginatedWorkspaceActions,
  PaginatedWorkspaceConnectors,
  PaginatedWorkspaceObjects,
  RejectWorkspaceActionRequest,
  UpdateWorkspaceConnectorRequest,
  WorkspaceAction,
  WorkspaceConnector,
  WorkspaceHealthCheckResult,
  WorkspaceObject,
  WorkspaceSearchQuery,
  WorkspaceSearchResponse,
  WorkspaceSyncResult,
} from '../../types/workspace.types';

const BASE = '/api/v1/workspace';

export async function listWorkspaceConnectors(
  query?: ListWorkspaceConnectorsQuery,
): Promise<PaginatedWorkspaceConnectors> {
  const params = new URLSearchParams();
  if (query?.page !== undefined) {
    params.set('page', String(query.page));
  }
  if (query?.pageSize !== undefined) {
    params.set('pageSize', String(query.pageSize));
  }
  if (query?.provider !== undefined) {
    params.set('provider', query.provider);
  }
  if (query?.status !== undefined) {
    params.set('status', query.status);
  }
  if (query?.isEnabled !== undefined) {
    params.set('isEnabled', String(query.isEnabled));
  }
  const qs = params.toString();
  const response = await apiClient.get<PaginatedWorkspaceConnectors>(
    `${BASE}/connectors${qs ? `?${qs}` : ''}`,
  );
  return response.data;
}

export async function getWorkspaceConnector(id: string): Promise<WorkspaceConnector> {
  const response = await apiClient.get<WorkspaceConnector>(`${BASE}/connectors/${id}`);
  return response.data;
}

export async function createWorkspaceConnector(
  dto: CreateWorkspaceConnectorRequest,
): Promise<WorkspaceConnector> {
  const response = await apiClient.post<WorkspaceConnector>(`${BASE}/connectors`, dto);
  return response.data;
}

export async function updateWorkspaceConnector(
  id: string,
  dto: UpdateWorkspaceConnectorRequest,
): Promise<WorkspaceConnector> {
  const response = await apiClient.patch<WorkspaceConnector>(`${BASE}/connectors/${id}`, dto);
  return response.data;
}

export async function deleteWorkspaceConnector(id: string): Promise<WorkspaceConnector> {
  const response = await apiClient.delete<WorkspaceConnector>(`${BASE}/connectors/${id}`);
  return response.data;
}

export async function testWorkspaceConnectorHealth(
  id: string,
): Promise<WorkspaceHealthCheckResult> {
  const response = await apiClient.post<WorkspaceHealthCheckResult>(
    `${BASE}/connectors/${id}/health`,
    {},
  );
  return response.data;
}

export async function triggerWorkspaceSync(
  id: string,
  delta = false,
): Promise<WorkspaceSyncResult> {
  const response = await apiClient.post<WorkspaceSyncResult>(
    `${BASE}/connectors/${id}/sync?delta=${String(delta)}`,
    {},
  );
  return response.data;
}

export async function initWorkspaceOAuth(dto: OAuthInitRequest): Promise<OAuthInitResult> {
  const response = await apiClient.post<OAuthInitResult>(`${BASE}/oauth/init`, dto);
  return response.data;
}

export async function listWorkspaceObjects(
  query?: ListWorkspaceObjectsQuery,
): Promise<PaginatedWorkspaceObjects> {
  const params = new URLSearchParams();
  if (query?.page !== undefined) {
    params.set('page', String(query.page));
  }
  if (query?.limit !== undefined) {
    params.set('limit', String(query.limit));
  }
  if (query?.connectorId !== undefined) {
    params.set('connectorId', query.connectorId);
  }
  if (query?.type !== undefined) {
    params.set('type', query.type);
  }
  const qs = params.toString();
  const response = await apiClient.get<PaginatedWorkspaceObjects>(
    `${BASE}/objects${qs ? `?${qs}` : ''}`,
  );
  return response.data;
}

export async function getWorkspaceObject(id: string): Promise<WorkspaceObject> {
  const response = await apiClient.get<WorkspaceObject>(`${BASE}/objects/${id}`);
  return response.data;
}

export async function searchWorkspace(dto: WorkspaceSearchQuery): Promise<WorkspaceSearchResponse> {
  const response = await apiClient.post<WorkspaceSearchResponse>(`${BASE}/search`, dto);
  return response.data;
}

export async function listWorkspaceActions(
  query?: ListWorkspaceActionsQuery,
): Promise<PaginatedWorkspaceActions> {
  const params = new URLSearchParams();
  if (query?.page !== undefined) {
    params.set('page', String(query.page));
  }
  if (query?.pageSize !== undefined) {
    params.set('pageSize', String(query.pageSize));
  }
  if (query?.status !== undefined) {
    params.set('status', query.status);
  }
  if (query?.connectorId !== undefined) {
    params.set('connectorId', query.connectorId);
  }
  const qs = params.toString();
  const response = await apiClient.get<PaginatedWorkspaceActions>(
    `${BASE}/actions${qs ? `?${qs}` : ''}`,
  );
  return response.data;
}

export async function getWorkspaceAction(id: string): Promise<WorkspaceAction> {
  const response = await apiClient.get<WorkspaceAction>(`${BASE}/actions/${id}`);
  return response.data;
}

export async function createWorkspaceAction(
  dto: CreateWorkspaceActionRequest,
): Promise<WorkspaceAction> {
  const response = await apiClient.post<WorkspaceAction>(`${BASE}/actions`, dto);
  return response.data;
}

export async function approveWorkspaceAction(id: string): Promise<WorkspaceAction> {
  const response = await apiClient.post<WorkspaceAction>(`${BASE}/actions/${id}/approve`, {});
  return response.data;
}

export async function rejectWorkspaceAction(
  id: string,
  dto?: RejectWorkspaceActionRequest,
): Promise<WorkspaceAction> {
  const response = await apiClient.post<WorkspaceAction>(`${BASE}/actions/${id}/reject`, dto ?? {});
  return response.data;
}
