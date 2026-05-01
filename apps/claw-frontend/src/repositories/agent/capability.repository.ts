import { apiClient } from '../../services/shared/api-client';
import type {
  CancelCapabilityRequest,
  CapabilityInvocation,
  CapabilityProposalResult,
  ListCapabilitiesQuery,
  PaginatedCapabilities,
  ProposeCapabilityRequest,
  RejectCapabilityRequest,
  RollbackCapabilityRequest,
} from '../../types/capability.types';

const BASE = '/agent/capabilities';

export async function listCapabilities(
  query?: ListCapabilitiesQuery,
): Promise<PaginatedCapabilities> {
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
  if (query?.capabilityClass !== undefined) {
    params.set('capabilityClass', query.capabilityClass);
  }
  if (query?.recipeRunId !== undefined) {
    params.set('recipeRunId', query.recipeRunId);
  }
  if (query?.deviceId !== undefined) {
    params.set('deviceId', query.deviceId);
  }
  const qs = params.toString();
  const response = await apiClient.get<PaginatedCapabilities>(
    `${BASE}${qs ? `?${qs}` : ''}`,
  );
  return response.data;
}

export async function getCapability(id: string): Promise<CapabilityInvocation> {
  const response = await apiClient.get<CapabilityInvocation>(`${BASE}/${id}`);
  return response.data;
}

export async function proposeCapability(
  dto: ProposeCapabilityRequest,
): Promise<CapabilityProposalResult> {
  const response = await apiClient.post<CapabilityProposalResult>(BASE, dto);
  return response.data;
}

export async function approveCapability(id: string): Promise<CapabilityInvocation> {
  const response = await apiClient.post<CapabilityInvocation>(`${BASE}/${id}/approve`, {});
  return response.data;
}

export async function rejectCapability(
  id: string,
  dto: RejectCapabilityRequest,
): Promise<CapabilityInvocation> {
  const response = await apiClient.post<CapabilityInvocation>(`${BASE}/${id}/reject`, dto);
  return response.data;
}

export async function cancelCapability(
  id: string,
  dto: CancelCapabilityRequest = {},
): Promise<CapabilityInvocation> {
  const response = await apiClient.post<CapabilityInvocation>(`${BASE}/${id}/cancel`, dto);
  return response.data;
}

export async function rollbackCapability(
  id: string,
  dto: RollbackCapabilityRequest = {},
): Promise<CapabilityInvocation> {
  const response = await apiClient.post<CapabilityInvocation>(`${BASE}/${id}/rollback`, dto);
  return response.data;
}
