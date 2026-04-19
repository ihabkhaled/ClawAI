import type {
  AdapterCapabilities,
  HealthCheckResult,
  OAuthTokenSet,
  SyncedObject,
  SyncResult,
  WriteActionResult,
} from '../types/workspace.types';

export type { SyncedObject };

/**
 * Credentials passed per-call, resolved at runtime from
 * `WorkspaceProviderAppConfig` (DB-backed). Adapters MUST NOT read
 * credentials from `process.env` or from AppConfig.
 */
export type AdapterAppCredentials = {
  clientId?: string;
  clientSecret?: string;
  personalAccessToken?: string;
  baseUrl?: string;
  tenantId?: string;
  extra?: Record<string, string>;
};

export interface WorkspaceAdapter {
  /** Probe reachability for a connector's stored credentials. */
  healthCheck(accessToken: string, baseUrl?: string): Promise<HealthCheckResult>;

  /** Paginated sync of primary objects. */
  syncObjects(accessToken: string, deltaToken?: string): Promise<SyncResult>;

  /** OAuth2 authorization-code exchange. Takes per-call app credentials. */
  exchangeCodeForTokens(
    code: string,
    redirectUri: string,
    codeVerifier: string | undefined,
    appCredentials: AdapterAppCredentials,
  ): Promise<OAuthTokenSet>;

  /** OAuth2 refresh-token flow. Takes per-call app credentials. */
  refreshTokens(
    refreshToken: string,
    appCredentials: AdapterAppCredentials,
  ): Promise<OAuthTokenSet>;

  /**
   * Validate PAT / personal access token credentials with a cheap API call.
   * Returns a normalized health-check result; treat `healthy: false` as bad token.
   */
  validatePat?(personalAccessToken: string, baseUrl?: string): Promise<HealthCheckResult>;

  getCapabilities(): AdapterCapabilities;

  /**
   * Provider's OAuth authorization endpoint (fixed per provider).
   * Adapter does NOT construct the URL with client_id — the caller (OAuthTokenManager)
   * assembles the full URL using DB-backed client_id + adapter-provided scopes.
   */
  getAuthorizationBaseUrl(): string;

  getDefaultScopes(): string[];

  // Optional write capability — only implemented by adapters that support write actions
  supportsWrite?(): boolean;
  executeWriteAction?(
    accessToken: string,
    actionType: string,
    payload: Record<string, unknown>,
  ): Promise<WriteActionResult>;
}
