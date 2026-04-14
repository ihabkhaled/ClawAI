import type {
  AdapterCapabilities,
  HealthCheckResult,
  OAuthTokenSet,
  SyncedObject,
  SyncResult,
  WriteActionResult,
} from '../types/workspace.types';

export type { SyncedObject };

export interface WorkspaceAdapter {
  healthCheck(accessToken: string, baseUrl?: string): Promise<HealthCheckResult>;
  syncObjects(accessToken: string, deltaToken?: string): Promise<SyncResult>;
  exchangeCodeForTokens(
    code: string,
    redirectUri: string,
    codeVerifier?: string,
  ): Promise<OAuthTokenSet>;
  refreshTokens(refreshToken: string): Promise<OAuthTokenSet>;
  getCapabilities(): AdapterCapabilities;
  getAuthorizationBaseUrl(): string;
  getClientId(): string;
  getDefaultScopes(): string[];

  // Optional write capability — only implemented by adapters that support write actions
  supportsWrite?(): boolean;
  executeWriteAction?(
    accessToken: string,
    actionType: string,
    payload: Record<string, unknown>,
  ): Promise<WriteActionResult>;
}
