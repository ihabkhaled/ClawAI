import type {
  AdminRuleKind,
  AdminRuleMatch,
  AdminServerStatus,
  CuratedHealthStatus,
  CuratedTransport,
  PluginAuthKindName,
  PluginToolRiskLevel,
} from '@claw/shared-types';

import { PLUGIN_CATEGORIES, PLUGIN_ICONS } from '@/constants/plugins.constants';
import { Locale } from '@/enums/locale.enum';

export const ADMIN_CURATION_BASE_PATH = '/plugins/admin';
export const ADMIN_CURATION_ROUTE = '/admin/plugins/curation';

export const ADMIN_CURATION_LOCALES: ReadonlyArray<{ value: string; label: string }> =
  Object.values(Locale).map((locale) => ({ value: locale, label: locale.toUpperCase() }));

export const ADMIN_CURATION_QUERY_KEYS = {
  entries: ['plugins', 'admin', 'curated'] as const,
  servers: (status: string) => ['plugins', 'admin', 'servers', status] as const,
  serversRoot: ['plugins', 'admin', 'servers'] as const,
  rules: ['plugins', 'admin', 'rules'] as const,
  audit: ['plugins', 'admin', 'audit'] as const,
};

export const ADMIN_CURATION_AUDIT_LIMIT = 100;
export const ADMIN_CURATION_PATTERN_MAX = 253;
export const ADMIN_CURATION_NOTE_MAX = 200;
export const ADMIN_CURATION_REASON_MAX = 200;
export const ADMIN_CURATION_URL_MAX = 2048;
export const ADMIN_CURATION_NOTES_MAX = 1000;
export const ADMIN_CURATION_TEXT_MAX = { name: 80, summary: 160, description: 2000 } as const;
export const ADMIN_CURATION_PROBE_KEY_MAX = 4096;

export const ADMIN_CURATION_CATEGORIES: readonly string[] = PLUGIN_CATEGORIES;
export const ADMIN_CURATION_ICON_KEYS: readonly string[] = Object.keys(PLUGIN_ICONS);

export const ADMIN_CURATION_TRANSPORTS: ReadonlyArray<{
  value: CuratedTransport;
  labelKey: string;
}> = [
  { value: 'streamable-http', labelKey: 'pluginsAdminCatalog.form.transportHttp' },
  { value: 'sse', labelKey: 'pluginsAdminCatalog.form.transportSse' },
];

export const ADMIN_CURATION_AUTH_KINDS: ReadonlyArray<{
  value: PluginAuthKindName;
  labelKey: string;
}> = [
  { value: 'NONE', labelKey: 'pluginsAdminCatalog.form.authNone' },
  { value: 'API_KEY', labelKey: 'pluginsAdminCatalog.form.authApiKey' },
  { value: 'BEARER_TOKEN', labelKey: 'pluginsAdminCatalog.form.authBearer' },
  { value: 'OAUTH2_PKCE', labelKey: 'pluginsAdminCatalog.form.authOauth' },
];

export const ADMIN_CURATION_RISKS: ReadonlyArray<{ value: PluginToolRiskLevel; labelKey: string }> =
  [
    { value: 'READ', labelKey: 'plugins.risk.read' },
    { value: 'WRITE', labelKey: 'plugins.risk.write' },
    { value: 'DESTRUCTIVE', labelKey: 'plugins.risk.destructive' },
  ];

export const ADMIN_CURATION_SERVER_FILTERS: ReadonlyArray<{
  value: AdminServerStatus;
  labelKey: string;
}> = [
  { value: 'PENDING_APPROVAL', labelKey: 'pluginsAdminCatalog.queue.filterPending' },
  { value: 'APPROVED', labelKey: 'pluginsAdminCatalog.queue.filterApproved' },
  { value: 'REJECTED', labelKey: 'pluginsAdminCatalog.queue.filterRejected' },
  { value: 'NEEDS_REVIEW', labelKey: 'pluginsAdminCatalog.queue.filterReview' },
];

export const ADMIN_CURATION_RULE_KINDS: ReadonlyArray<{ value: AdminRuleKind; labelKey: string }> =
  [
    { value: 'DENY', labelKey: 'pluginsAdminCatalog.rules.kindDeny' },
    { value: 'ALLOW', labelKey: 'pluginsAdminCatalog.rules.kindAllow' },
  ];

export const ADMIN_CURATION_RULE_MATCHES: ReadonlyArray<{
  value: AdminRuleMatch;
  labelKey: string;
}> = [
  { value: 'HOST', labelKey: 'pluginsAdminCatalog.rules.matchHost' },
  { value: 'PUBLISHER', labelKey: 'pluginsAdminCatalog.rules.matchPublisher' },
  { value: 'SLUG', labelKey: 'pluginsAdminCatalog.rules.matchSlug' },
];

export const ADMIN_CURATION_HEALTH_KEYS: Readonly<Record<CuratedHealthStatus, string>> = {
  OK: 'pluginsAdminCatalog.entries.healthOk',
  DOWN: 'pluginsAdminCatalog.entries.healthDown',
  UNKNOWN: 'pluginsAdminCatalog.entries.healthUnknown',
};

export const ADMIN_CURATION_HEALTH_VARIANTS: Readonly<
  Record<CuratedHealthStatus, 'success' | 'destructive' | 'outline'>
> = {
  OK: 'success',
  DOWN: 'destructive',
  UNKNOWN: 'outline',
};

/** Backend error code -> translation key. Anything else falls back to the generic plugin message. */
export const ADMIN_CURATION_ERROR_KEYS: Readonly<Record<string, string>> = {
  PLUGIN_CURATION_SLUG_TAKEN: 'pluginsAdminCatalog.errors.exists',
  PLUGIN_CURATION_NOT_CURATED: 'pluginsAdminCatalog.errors.notFound',
  PLUGIN_CURATION_MANIFEST_INVALID: 'pluginsAdminCatalog.errors.invalid',
  PLUGIN_CURATION_URL_BLOCKED: 'pluginsAdminCatalog.errors.urlBlocked',
  PLUGIN_CURATION_HOST_DENIED: 'pluginsAdminCatalog.errors.hostDenied',
  PLUGIN_CURATION_PROBE_FAILED: 'pluginsAdminCatalog.errors.probeFailed',
  PLUGIN_CURATION_TOOLS_UNVERIFIED: 'pluginsAdminCatalog.errors.toolsUnverified',
  PLUGIN_CURATION_OAUTH_UNSUPPORTED: 'pluginsAdminCatalog.errors.oauthUnsupported',
  PLUGIN_CURATION_NEEDS_VERIFICATION: 'pluginsAdminCatalog.errors.needsVerification',
  PLUGIN_CURATION_SERVER_NOT_PENDING: 'pluginsAdminCatalog.errors.notPending',
  PLUGIN_CURATION_RULE_EXISTS: 'pluginsAdminCatalog.errors.exists',
  PLUGIN_CURATION_RULE_INVALID: 'pluginsAdminCatalog.errors.invalid',
  PLUGIN_CURATION_NOT_FOUND: 'pluginsAdminCatalog.errors.notFound',
};

export const ADMIN_CURATION_ERROR_GENERIC = 'pluginsAdminCatalog.errors.generic';
