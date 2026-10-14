// HTTP contract of the plugin service admin curation API (PLUGINS_ADMIN).
// Base path /api/v1/plugins/admin. Credentials are never returned; a probe credential is used once and dropped.

import type { PluginAuthKindName, PluginToolRiskLevel } from './plugin-installs.type';

export type CuratedHealthStatus = 'UNKNOWN' | 'OK' | 'DOWN';
export type CuratedTransport = 'streamable-http' | 'sse';
export type AdminRuleKind = 'ALLOW' | 'DENY';
export type AdminRuleMatch = 'HOST' | 'PUBLISHER' | 'SLUG';
export type AdminServerStatus =
  'PENDING_APPROVAL' | 'APPROVED' | 'REJECTED' | 'DISABLED' | 'NEEDS_REVIEW' | 'UNREACHABLE';

export type CuratedLocaleText = { name: string; summary: string; description: string };

export interface CuratedAuthInput {
  kind: PluginAuthKindName;
  headerName?: string;
  oauth?: { authorizeUrl: string; tokenUrl: string; scopes: string[] };
}

export interface CuratedToolInput {
  name: string;
  title?: string;
  description: string;
  riskLevel: PluginToolRiskLevel;
  inputSchema?: Record<string, unknown>;
}

// POST /curated and PUT /curated/:slug. `publish` true makes a bounded tools/list probe and refuses a
// tool the server does not list. `probeCredential` is used for that probe only and is never stored.
export interface CuratedEntryRequest {
  slug?: string;
  publisher: string;
  category: string;
  iconKey: string;
  homepageUrl?: string;
  translations: { en: CuratedLocaleText } & Partial<Record<string, CuratedLocaleText>>;
  server: { url: string; transport: CuratedTransport };
  auth: CuratedAuthInput;
  tools: CuratedToolInput[];
  allowedPlanSlugs: string[];
  adminNotes?: string;
  publish: boolean;
  probeCredential?: string;
}

export interface CuratedToolView {
  name: string;
  riskLevel: PluginToolRiskLevel;
  disabledByAdmin: boolean;
}

export interface CuratedEntryView {
  slug: string;
  status: string;
  name: string;
  publisher: string;
  category: string;
  iconKey: string;
  homepageUrl: string | null;
  url: string | null;
  transport: CuratedTransport | null;
  authKind: PluginAuthKindName;
  authHeaderName: string | null;
  globallyEnabled: boolean;
  featured: boolean;
  deleted: boolean;
  needsVerification: boolean;
  adminNotes: string | null;
  allowedPlanSlugs: string[];
  version: string | null;
  installCount: number;
  tools: CuratedToolView[];
  health: {
    status: CuratedHealthStatus;
    latencyMs: number | null;
    checkedAt: string | null;
    errorCode: string | null;
  };
  translations: Record<string, CuratedLocaleText>;
  source: string;
}

// POST /curated/preview
export interface CuratedPreviewRequest {
  url: string;
  transport: CuratedTransport;
  auth: CuratedAuthInput;
  credential?: string;
}

export interface CuratedPreviewToolView {
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
  defaultRisk: PluginToolRiskLevel;
  /** False when the server's tool name cannot be used as a curated tool name (lower case, digits, underscore). */
  curatable: boolean;
}

export interface CuratedPreviewView {
  serverName: string | null;
  latencyMs: number;
  tools: CuratedPreviewToolView[];
  skipped: Array<{ name: string; reason: string }>;
  ignored: number;
}

export interface CuratedStateRequest {
  enabled: boolean;
}

export interface AdminServerToolView {
  name: string;
  description: string;
  riskLevel: PluginToolRiskLevel;
}

export interface AdminServerView {
  id: string;
  name: string;
  slug: string;
  submitterUserId: string;
  urlHost: string;
  urlPath: string;
  authKind: PluginAuthKindName;
  hasCredential: boolean;
  status: AdminServerStatus;
  highestRisk: PluginToolRiskLevel;
  toolCount: number;
  tools: AdminServerToolView[];
  toolsHash: string | null;
  serverName: string | null;
  createdAt: string;
  decidedBy: string | null;
  decidedAt: string | null;
  decisionReason: string | null;
}

export interface RejectServerRequest {
  reason: string;
}

export interface AdminRuleView {
  id: string;
  kind: AdminRuleKind;
  match: AdminRuleMatch;
  pattern: string;
  note: string | null;
  createdBy: string;
  createdAt: string;
}

export interface CreateAdminRuleRequest {
  kind: AdminRuleKind;
  match: AdminRuleMatch;
  pattern: string;
  note?: string;
}

export interface AdminAuditRowView {
  id: string;
  actorId: string;
  action: string;
  targetType: string;
  targetId: string;
  summary: Record<string, unknown>;
  createdAt: string;
}

export type PluginAdminCurationErrorCode =
  | 'PLUGIN_CURATION_SLUG_TAKEN'
  | 'PLUGIN_CURATION_NOT_CURATED'
  | 'PLUGIN_CURATION_MANIFEST_INVALID'
  | 'PLUGIN_CURATION_URL_BLOCKED'
  | 'PLUGIN_CURATION_HOST_DENIED'
  | 'PLUGIN_CURATION_PROBE_FAILED'
  | 'PLUGIN_CURATION_TOOLS_UNVERIFIED'
  | 'PLUGIN_CURATION_OAUTH_UNSUPPORTED'
  | 'PLUGIN_CURATION_NEEDS_VERIFICATION'
  | 'PLUGIN_CURATION_SERVER_NOT_PENDING'
  | 'PLUGIN_CURATION_RULE_EXISTS'
  | 'PLUGIN_CURATION_RULE_INVALID'
  | 'PLUGIN_CURATION_NOT_FOUND';
