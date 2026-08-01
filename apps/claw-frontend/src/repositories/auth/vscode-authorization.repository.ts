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

export async function deliverVscodeAuthorization(
  redirectUri: string,
  fetcher: typeof fetch = globalThis.fetch,
): Promise<void> {
  const callback = new URL(redirectUri);
  const isLoopback = callback.hostname === '127.0.0.1' || callback.hostname === '[::1]';
  if (callback.protocol !== 'http:' || !isLoopback || callback.pathname !== '/auth/callback') {
    throw new Error('Invalid VS Code authorization callback.');
  }
  await fetcher(callback.href, {
    cache: 'no-store',
    credentials: 'omit',
    mode: 'no-cors',
  });
}
