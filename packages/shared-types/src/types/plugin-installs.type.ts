// HTTP contract of the plugin service installs and admin API (batch 2).
// Base path /api/v1/plugins. Credentials are write-only: no response carries a secret.
// The three string unions below mirror the service enums (InstallState, RiskLevel, AuthKind). They stay
// literal unions on purpose: the frontend builds and tests them from string literals, and an enum type
// would reject those literals. The service maps its enums onto these exact strings.

export type PluginInstallState = 'ENABLED' | 'DISABLED' | 'UNAVAILABLE';

export type PluginToolRiskLevel = 'READ' | 'WRITE' | 'DESTRUCTIVE';

export type PluginAuthKindName = 'NONE' | 'API_KEY' | 'BEARER_TOKEN' | 'OAUTH2_PKCE';

export type PluginInstallErrorCode =
  | 'PLUGIN_INSTALL_LIMIT'
  | 'PLUGIN_PLAN_DISABLED'
  | 'PLUGIN_ENTITLEMENTS_UNAVAILABLE'
  | 'PLUGIN_ALREADY_INSTALLED'
  | 'PLUGIN_NOT_FOUND'
  | 'PLUGIN_UNAVAILABLE'
  | 'PLUGIN_VERSION_NOT_FOUND'
  | 'PLUGIN_INSTALL_NOT_FOUND'
  | 'PLUGIN_SETTINGS_INVALID'
  | 'PLUGIN_TOOL_NOT_FOUND'
  | 'PLUGIN_CONSENT_NOT_REQUIRED'
  | 'PLUGIN_CONSENT_LEVEL_MISMATCH'
  | 'PLUGIN_CREDENTIAL_NOT_SUPPORTED'
  | 'PLUGIN_CREDENTIAL_HEADER_DENIED'
  | 'PLUGIN_SETTING_INVALID';

// POST /installs
export interface InstallPluginRequest {
  slug: string;
  version?: string;
  settings?: Record<string, unknown>;
}

// PATCH /installs/:id
export interface UpdatePluginInstallRequest {
  enabled?: boolean;
  settings?: Record<string, unknown>;
}

// PUT /installs/:id/credential
export interface PutPluginCredentialRequest {
  kind: 'API_KEY';
  value: string;
  headerName?: string;
}

// Response of PUT /installs/:id/credential. DELETE returns 204.
export interface PluginCredentialStatus {
  hasCredential: boolean;
  kind: PluginAuthKindName | null;
  updatedAt: string | null;
}

// POST /installs/:id/consent. READ tools need no consent (400 PLUGIN_CONSENT_NOT_REQUIRED);
// level must equal the tool's declared risk (400 PLUGIN_CONSENT_LEVEL_MISMATCH).
// WRITE is remembered; DESTRUCTIVE is stored but the runtime still asks on every call.
export interface GrantPluginConsentRequest {
  toolName: string;
  level: Exclude<PluginToolRiskLevel, 'READ'>;
}

// DELETE /installs/:id/consent/:toolName revokes one remembered grant. It answers 204, is idempotent
// (no grant is still 204) and is owner-scoped: another user's install answers 404 PLUGIN_INSTALL_NOT_FOUND.
export interface PluginToolConsentView {
  toolName: string;
  level: PluginToolRiskLevel;
  grantedAt: string;
}

export interface PluginInstallView {
  id: string;
  slug: string;
  name: string;
  iconKey: string;
  version: string;
  latestVersion: string | null;
  state: PluginInstallState;
  authKind: PluginAuthKindName;
  settings: Record<string, unknown>;
  credential: PluginCredentialStatus;
  consents: PluginToolConsentView[];
  installedAt: string;
  updatedAt: string;
}

// GET /installs/mentions
export interface PluginMentionView {
  installId: string;
  slug: string;
  name: string;
  iconKey: string;
  enabled: boolean;
}

// Admin: GET /admin/catalog, GET/PATCH /admin/catalog/:slug
export interface PluginAdminToolView {
  name: string;
  riskLevel: PluginToolRiskLevel;
  disabledByAdmin: boolean;
}

export interface PluginAdminCatalogEntryView {
  slug: string;
  name: string;
  publisher: string;
  category: string;
  iconKey: string;
  source: 'FIRST_PARTY' | 'CURATED_MCP';
  status: 'DRAFT' | 'PUBLISHED' | 'DEPRECATED' | 'HIDDEN';
  version: string | null;
  globallyEnabled: boolean;
  featured: boolean;
  installCount: number;
  tools: PluginAdminToolView[];
}

export interface UpdatePluginAdminCatalogRequest {
  globallyEnabled?: boolean;
  featured?: boolean;
  tools?: Array<{ name: string; disabledByAdmin: boolean }>;
}

// Admin: GET/PATCH /admin/settings
export type PluginSettingValue = boolean | number;

export interface PluginSettingView {
  key: string;
  value: PluginSettingValue;
  updatedAt: string | null;
}

export interface UpdatePluginSettingsRequest {
  values: Record<string, PluginSettingValue>;
}

// 403 body of POST /installs when the plan cap is reached (errorCode PLUGIN_INSTALL_LIMIT).
export interface PluginInstallLimitDetail {
  limit: number;
  current: number;
}
