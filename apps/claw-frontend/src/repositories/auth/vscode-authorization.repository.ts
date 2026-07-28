import { apiClient } from '@/services/shared/api-client';
import type {
  VscodeAuthorizationApproval,
  VscodeAuthorizationDetails,
} from '@/types/vscode-authorization.types';

const BASE = '/auth/vscode/authorize';

export async function getVscodeAuthorizationDetails(
  requestId: string,
): Promise<VscodeAuthorizationDetails> {
  const response = await apiClient.post<VscodeAuthorizationDetails>(`${BASE}/details`, {
    requestId,
  });
  return response.data;
}

export async function approveVscodeAuthorization(
  requestId: string,
): Promise<VscodeAuthorizationApproval> {
  const response = await apiClient.post<VscodeAuthorizationApproval>(`${BASE}/approve`, {
    requestId,
  });
  return response.data;
}
