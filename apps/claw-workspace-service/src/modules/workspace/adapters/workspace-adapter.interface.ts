import type { WorkspaceActionType } from '../../../common/enums/workspace-action-type.enum';
import type {
  AdapterCapabilities,
  FileContentStream,
  HealthCheckResult,
  LiveObjectDetails,
  OAuthTokenSet,
  SyncedObject,
  SyncResult,
  WriteActionResult,
} from '../types/workspace.types';

export type { FileContentStream, LiveObjectDetails, SyncedObject };

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
  syncObjects(
    accessToken: string,
    deltaToken?: string,
    connectorMetadata?: Record<string, unknown>,
  ): Promise<SyncResult>;

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

  /**
   * Validate OAuth2 app credentials (clientId/clientSecret) WITHOUT a user flow.
   *
   * Implementation pattern: POST a deliberately invalid authorization_code to
   * the provider's token endpoint. Interpret the response:
   *   - error = invalid_grant / bad_verification_code / invalid_code
   *     → credentials ACCEPTED by provider (CONNECTED)
   *   - error = invalid_client / incorrect_client_credentials / unauthorized_client
   *     → credentials REJECTED (DISCONNECTED)
   *   - network / 5xx → UNKNOWN
   *
   * This is the standard "credentials-only probe" for OAuth2 apps.
   */
  validateOAuthAppConfig?(appCredentials: AdapterAppCredentials): Promise<HealthCheckResult>;

  getCapabilities(): AdapterCapabilities;

  /**
   * Provider's OAuth authorization endpoint (fixed per provider).
   * Adapter does NOT construct the URL with client_id — the caller (OAuthTokenManager)
   * assembles the full URL using DB-backed client_id + adapter-provided scopes.
   */
  getAuthorizationBaseUrl(): string;

  getDefaultScopes(): string[];

  /**
   * Whether this provider supports PKCE (code_challenge / code_verifier).
   * Defaults to true. Providers that do NOT support PKCE (e.g. Bitbucket)
   * must return false so the authorization URL is built without a challenge.
   */
  supportsPkce?(): boolean;

  /**
   * Extra query parameters appended to the authorization URL.
   * Use for provider-specific OAuth params not covered by the standard flow
   * (e.g. Google requires access_type=offline + prompt=consent to return a
   * refresh token on every authorization, not just the first one).
   */
  getExtraAuthParams?(): Record<string, string>;

  // Optional write capability — only implemented by adapters that support write actions
  supportsWrite?(): boolean;
  executeWriteAction?(
    accessToken: string,
    actionType: string,
    payload: Record<string, unknown>,
  ): Promise<WriteActionResult>;

  /**
   * The exact `WorkspaceActionType` values this adapter's `executeWriteAction`
   * dispatches on. This is the single source `provider-registry-drift.spec.ts`
   * cross-checks against `PROVIDER_DEFINITION_SEEDS.supportedActions` — keep
   * it in sync with the dispatch logic, not with the registry (the registry
   * is corrected FROM this, not the other way around). Adapters without
   * `supportsWrite` omit this entirely.
   */
  getSupportedActionTypes?(): WorkspaceActionType[];

  /**
   * Optional live-fetch for a single object by its external id. Implementors
   * return provider-native metadata that the operations-center uses to
   * refresh the stored WorkspaceObject. `null` means the object no longer
   * exists upstream (404/gone).
   */
  fetchObjectDetails?(
    accessToken: string,
    externalId: string,
    objectType: string,
    metadata?: Record<string, unknown>,
  ): Promise<LiveObjectDetails | null>;

  /**
   * v3 round 11 (2026-05-14) — Prompt 08: stream a file's raw bytes from
   * the provider. Implemented by file-backed providers (Google Drive,
   * OneDrive, SharePoint). The service layer pipes the result straight
   * to the HTTP response so large files never buffer fully in memory.
   * `null` means the file no longer exists upstream (404/gone).
   */
  downloadFileContent?(
    accessToken: string,
    externalId: string,
    metadata?: Record<string, unknown>,
  ): Promise<FileContentStream | null>;
}
