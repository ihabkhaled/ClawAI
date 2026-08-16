import { VersionDiffStatus } from '@/enums';
import {
  LowConfidenceAction,
  RouterChainEntryRole,
  RouterConfigurationBillingModel,
  RouterConfigurationMode,
  RouterConfigurationStatus,
  RouterProvider,
} from '@/enums/router-configuration.enum';

/** Mirrors ROUTER_CONFIGURATION_GLOBAL_SCOPE in claw-routing-service — the
 * only scope that exists today (per-tenant scoping needs a migration first).
 * Sent explicitly rather than relying on the backend's default so every
 * request in this feature is self-describing. */
export const SMART_ROUTER_GLOBAL_SCOPE = 'GLOBAL';

export const SMART_ROUTER_TAB_OVERVIEW = 'overview';
export const SMART_ROUTER_TAB_CHAIN = 'chain';
export const SMART_ROUTER_TAB_REVISIONS = 'revisions';
export const SMART_ROUTER_TAB_REVISION_DETAIL = 'revision-detail';
export const SMART_ROUTER_TAB_PUBLISH = 'publish';
export const SMART_ROUTER_TAB_COMPARE = 'compare';

export const SMART_ROUTER_REVISIONS_PAGE_SIZE = 20;

/** Sentinel Select value for "no status filter" — Radix Select rejects an
 * empty-string item value, so the Revisions tab's "All statuses" option
 * needs a real, reserved value that maps back to `undefined`. */
export const SMART_ROUTER_ALL_STATUSES_VALUE = 'ALL';

/** Defaults mirror the backend's Zod schema defaults for a new chain entry
 * (update-chain-entries.dto.ts) so a freshly opened add-entry form matches
 * what an omitted field would resolve to server-side. */
export const SMART_ROUTER_ENTRY_FORM_DEFAULTS = {
  provider: RouterProvider.ANTHROPIC,
  role: RouterChainEntryRole.PROVIDER_FALLBACK,
  billingModel: RouterConfigurationBillingModel.UNKNOWN,
  attemptTimeoutMs: 1600,
  retries: 0,
  enabled: true,
  skipWhenProviderCircuitOpen: true,
} as const;

/** Full dotted t() key per enum value — `t()` is not type-checked against
 * TranslationDictionary, so these constants are the single place a typo
 * would surface (a broken key here renders literally everywhere it's used). */
export const SMART_ROUTER_PROVIDER_LABEL_KEYS: Record<RouterProvider, string> = {
  [RouterProvider.OPENAI]: 'smartRouterAdmin.enums.provider.OPENAI',
  [RouterProvider.ANTHROPIC]: 'smartRouterAdmin.enums.provider.ANTHROPIC',
  [RouterProvider.GEMINI]: 'smartRouterAdmin.enums.provider.GEMINI',
  [RouterProvider.DEEPSEEK]: 'smartRouterAdmin.enums.provider.DEEPSEEK',
  [RouterProvider.GROK]: 'smartRouterAdmin.enums.provider.GROK',
  [RouterProvider.AWS_BEDROCK]: 'smartRouterAdmin.enums.provider.AWS_BEDROCK',
  [RouterProvider.OLLAMA]: 'smartRouterAdmin.enums.provider.OLLAMA',
  [RouterProvider.OLLAMA_CLOUD]: 'smartRouterAdmin.enums.provider.OLLAMA_CLOUD',
  [RouterProvider.LLAMACPP]: 'smartRouterAdmin.enums.provider.LLAMACPP',
};

export const SMART_ROUTER_ROLE_LABEL_KEYS: Record<RouterChainEntryRole, string> = {
  [RouterChainEntryRole.PRIMARY]: 'smartRouterAdmin.enums.role.PRIMARY',
  [RouterChainEntryRole.MODEL_FALLBACK]: 'smartRouterAdmin.enums.role.MODEL_FALLBACK',
  [RouterChainEntryRole.PROVIDER_FALLBACK]: 'smartRouterAdmin.enums.role.PROVIDER_FALLBACK',
  [RouterChainEntryRole.PROVIDER_MODEL_FALLBACK]:
    'smartRouterAdmin.enums.role.PROVIDER_MODEL_FALLBACK',
  [RouterChainEntryRole.LAST_RESORT]: 'smartRouterAdmin.enums.role.LAST_RESORT',
  [RouterChainEntryRole.QUALITY_ESCALATION]: 'smartRouterAdmin.enums.role.QUALITY_ESCALATION',
};

export const SMART_ROUTER_STATUS_LABEL_KEYS: Record<RouterConfigurationStatus, string> = {
  [RouterConfigurationStatus.DRAFT]: 'smartRouterAdmin.enums.status.DRAFT',
  [RouterConfigurationStatus.PUBLISHED]: 'smartRouterAdmin.enums.status.PUBLISHED',
  [RouterConfigurationStatus.SUPERSEDED]: 'smartRouterAdmin.enums.status.SUPERSEDED',
};

export const SMART_ROUTER_MODE_LABEL_KEYS: Record<RouterConfigurationMode, string> = {
  [RouterConfigurationMode.CLOUD_FIRST]: 'smartRouterAdmin.enums.mode.CLOUD_FIRST',
  [RouterConfigurationMode.HYBRID]: 'smartRouterAdmin.enums.mode.HYBRID',
  [RouterConfigurationMode.PRIVATE_CLOUD]: 'smartRouterAdmin.enums.mode.PRIVATE_CLOUD',
  [RouterConfigurationMode.LOCAL_ONLY]: 'smartRouterAdmin.enums.mode.LOCAL_ONLY',
};

export const SMART_ROUTER_LOW_CONFIDENCE_ACTION_LABEL_KEYS: Record<LowConfidenceAction, string> = {
  [LowConfidenceAction.QUALITY_ESCALATION_THEN_DETERMINISTIC]:
    'smartRouterAdmin.enums.lowConfidenceAction.QUALITY_ESCALATION_THEN_DETERMINISTIC',
  [LowConfidenceAction.DETERMINISTIC_ONLY]:
    'smartRouterAdmin.enums.lowConfidenceAction.DETERMINISTIC_ONLY',
  [LowConfidenceAction.FAIL_CLOSED]: 'smartRouterAdmin.enums.lowConfidenceAction.FAIL_CLOSED',
};

export const SMART_ROUTER_BILLING_MODEL_LABEL_KEYS: Record<
  RouterConfigurationBillingModel,
  string
> = {
  [RouterConfigurationBillingModel.TOKEN]: 'smartRouterAdmin.enums.billingModel.TOKEN',
  [RouterConfigurationBillingModel.REQUEST]: 'smartRouterAdmin.enums.billingModel.REQUEST',
  [RouterConfigurationBillingModel.SUBSCRIPTION]:
    'smartRouterAdmin.enums.billingModel.SUBSCRIPTION',
  [RouterConfigurationBillingModel.USAGE_LIMIT]: 'smartRouterAdmin.enums.billingModel.USAGE_LIMIT',
  [RouterConfigurationBillingModel.UNKNOWN]: 'smartRouterAdmin.enums.billingModel.UNKNOWN',
};

export const SMART_ROUTER_STATUS_BADGE_VARIANT: Record<
  RouterConfigurationStatus,
  'secondary' | 'success' | 'outline'
> = {
  [RouterConfigurationStatus.DRAFT]: 'secondary',
  [RouterConfigurationStatus.PUBLISHED]: 'success',
  [RouterConfigurationStatus.SUPERSEDED]: 'outline',
};

export const SMART_ROUTER_DIFF_STATUS_LABEL_KEYS: Record<VersionDiffStatus, string> = {
  [VersionDiffStatus.ADDED]: 'smartRouterAdmin.enums.diffStatus.ADDED',
  [VersionDiffStatus.REMOVED]: 'smartRouterAdmin.enums.diffStatus.REMOVED',
  [VersionDiffStatus.CHANGED]: 'smartRouterAdmin.enums.diffStatus.CHANGED',
  [VersionDiffStatus.UNCHANGED]: 'smartRouterAdmin.enums.diffStatus.UNCHANGED',
};

export const SMART_ROUTER_DIFF_STATUS_BADGE_VARIANT: Record<
  VersionDiffStatus,
  'success' | 'destructive' | 'warning' | 'secondary'
> = {
  [VersionDiffStatus.ADDED]: 'success',
  [VersionDiffStatus.REMOVED]: 'destructive',
  [VersionDiffStatus.CHANGED]: 'warning',
  [VersionDiffStatus.UNCHANGED]: 'secondary',
};

export const SMART_ROUTER_PROVIDER_OPTIONS: readonly RouterProvider[] =
  Object.values(RouterProvider);
export const SMART_ROUTER_ROLE_OPTIONS: readonly RouterChainEntryRole[] =
  Object.values(RouterChainEntryRole);
export const SMART_ROUTER_BILLING_MODEL_OPTIONS: readonly RouterConfigurationBillingModel[] =
  Object.values(RouterConfigurationBillingModel);
export const SMART_ROUTER_STATUS_FILTER_OPTIONS: readonly RouterConfigurationStatus[] =
  Object.values(RouterConfigurationStatus);
export const SMART_ROUTER_MODE_OPTIONS: readonly RouterConfigurationMode[] =
  Object.values(RouterConfigurationMode);
export const SMART_ROUTER_LOW_CONFIDENCE_ACTION_OPTIONS: readonly LowConfidenceAction[] =
  Object.values(LowConfidenceAction);
