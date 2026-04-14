import type {
  AdapterCapabilities,
  HealthCheckResult,
  OAuthTokenSet,
  SyncedObject,
  SyncResult,
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
}
