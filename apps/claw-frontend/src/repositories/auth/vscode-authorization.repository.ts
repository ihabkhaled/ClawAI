import { apiClient } from '@/services/shared/api-client';
import type {
  VscodeAuthorizationApproval,
  VscodeAuthorizationDetails,
} from '@/types/vscode-authorization.types';

const BASE = '/auth/vscode/authorize';

type VscodeAuthorizationNavigator = (callbackUrl: string) => void;

function navigateToCallback(callbackUrl: string): void {
  window.location.assign(callbackUrl);
}

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

export function deliverVscodeAuthorization(
  redirectUri: string,
  navigate: VscodeAuthorizationNavigator = navigateToCallback,
): void {
  const callback = new URL(redirectUri);
  const isLoopback = callback.hostname === '127.0.0.1' || callback.hostname === '[::1]';
  const hasExplicitPort = callback.port.length > 0;
  const hasCredentials = callback.username.length > 0 || callback.password.length > 0;

  if (
    callback.protocol !== 'http:' ||
    !isLoopback ||
    !hasExplicitPort ||
    hasCredentials ||
    callback.pathname !== '/auth/callback'
  ) {
    throw new Error('Invalid VS Code authorization callback.');
  }

  // A browser fetch from the HTTPS ClawAI app to a loopback HTTP server can be
  // blocked before CORS is evaluated. Native OAuth loopback callbacks are a
  // browser navigation handoff, so keep the callback constrained and navigate.
  navigate(callback.href);
}
