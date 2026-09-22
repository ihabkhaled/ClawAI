import type { PaginatedResult } from '@claw/shared-types';

import type { VersionDiffStatus } from '@/enums';
import type { Locale } from '@/enums/locale.enum';
import type {
  LowConfidenceAction,
  RouterChainEntryRole,
  RouterConfigurationBillingModel,
  RouterConfigurationMode,
  RouterConfigurationStatus,
  RouterProvider,
} from '@/enums/router-configuration.enum';

import type { FormFieldErrors } from './component.types';
import type { TranslateFunction } from './i18n.types';

// ─── Backend DTO mirrors (claw-routing-service router-configuration-admin) ───

export type RouterChainEntry = {
  id: string;
  order: number;
  enabled: boolean;
  role: RouterChainEntryRole;
  deploymentId: string | null;
  modelAlias: string;
  provider: RouterProvider;
  attemptTimeoutMs: number;
  retries: number;
  triggers: readonly string[];
  skipWhenProviderCircuitOpen: boolean;
  minConfidence: number | null;
  /** Serialized decimal string — BigInt does not survive JSON. */
  maxCostMicroUsd: string | null;
  billingModel: RouterConfigurationBillingModel;
  lastValidatedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type RouterConfigurationSummary = {
  id: string;
  scope: string;
  revision: number;
  status: RouterConfigurationStatus;
  mode: RouterConfigurationMode;
  enabled: boolean;
  totalDeadlineMs: number;
  maxAttempts: number;
  maxRouterInputTokens: number;
  maxRouterOutputTokens: number;
  minConfidence: number;
  lowConfidenceAction: LowConfidenceAction;
  failClosedWhenNoEligibleRouter: boolean;
  skipProviderOnProviderWideFailure: boolean;
  safeTraceLevel: string;
  legacyLocalRollbackEnabled: boolean;
  supersedesRevision: number | null;
  publishedAt: string | null;
  publishedBy: string | null;
  createdAt: string;
  updatedAt: string;
  entryCount: number;
};

export type RouterConfigurationDetail = Omit<RouterConfigurationSummary, 'entryCount'> & {
  entries: readonly RouterChainEntry[];
};

export type ChainEntryInput = {
  role: RouterChainEntryRole;
  provider: RouterProvider;
  modelAlias: string;
  deploymentId?: string;
  enabled: boolean;
  attemptTimeoutMs: number;
  retries: number;
  triggers: readonly string[];
  skipWhenProviderCircuitOpen: boolean;
  minConfidence?: number;
  maxCostMicroUsd?: number;
  billingModel: RouterConfigurationBillingModel;
};

export type ListRouterConfigurationsQuery = {
  scope?: string;
  status?: RouterConfigurationStatus;
  page?: number;
  limit?: number;
};

export type CreateRouterConfigurationRequest = {
  scope?: string;
};

export type UpdateChainEntriesRequest = {
  entries: ChainEntryInput[];
};

export type PaginatedRouterConfigurations = PaginatedResult<RouterConfigurationSummary>;

// ─── Client-side revision diff (Compare tab) ──────────────────────────────────

export type RouterChainEntryDiffItem = {
  order: number;
  status: VersionDiffStatus;
  before: ChainEntryInput | null;
  after: ChainEntryInput | null;
  changedFields: readonly string[];
};

export type RouterConfigurationDiff = {
  fromRevision: number;
  toRevision: number;
  entries: readonly RouterChainEntryDiffItem[];
};

// ─── Atomic hook return shapes ─────────────────────────────────────────────────

export type UseSmartRouterPublishedSummaryResult = {
  published: RouterConfigurationSummary | null;
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
};

export type UseSmartRouterDraftSummaryResult = {
  draft: RouterConfigurationSummary | null;
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
};

export type UseSmartRouterRevisionsListResult = {
  revisions: RouterConfigurationSummary[];
  meta: { total: number; page: number; limit: number; totalPages: number };
  statusFilter: RouterConfigurationStatus | undefined;
  setStatusFilter: (status: RouterConfigurationStatus | undefined) => void;
  page: number;
  setPage: (page: number) => void;
  pageSize: number;
  setPageSize: (size: number) => void;
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
};

export type UseSmartRouterConfigurationDetailResult = {
  configuration: RouterConfigurationDetail | null;
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
};

export type UseSmartRouterCreateDraftResult = {
  createDraft: () => void;
  isPending: boolean;
};

export type UseSmartRouterUpdateEntriesResult = {
  updateEntries: (id: string, entries: ChainEntryInput[]) => void;
  isPending: boolean;
};

export type UseSmartRouterPublishResult = {
  publish: (id: string) => void;
  isPending: boolean;
};

export type UseSmartRouterSetEnabledResult = {
  setEnabled: (enabled: boolean) => void;
  isPending: boolean;
};

export type UseSmartRouterAddEntryFormResult = {
  /** Catalog models for the selected provider, for the model picker. */
  modelOptions: readonly SelectableDeployment[];
  provider: RouterProvider;
  setProvider: (value: RouterProvider) => void;
  modelAlias: string;
  setModelAlias: (value: string) => void;
  role: RouterChainEntryRole;
  setRole: (value: RouterChainEntryRole) => void;
  billingModel: RouterConfigurationBillingModel;
  setBillingModel: (value: RouterConfigurationBillingModel) => void;
  deploymentId: string;
  setDeploymentId: (value: string) => void;
  attemptTimeoutMs: number;
  setAttemptTimeoutMs: (value: number) => void;
  retries: number;
  setRetries: (value: number) => void;
  triggers: string;
  setTriggers: (value: string) => void;
  fieldErrors: FormFieldErrors;
  buildInput: () => ChainEntryInput | null;
  reset: () => void;
};

// ─── Controller hook section shapes (composed by the one page controller) ─────

export type SmartRouterOverviewSection = {
  published: RouterConfigurationSummary | null;
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
  isTogglePending: boolean;
  onToggleEnabled: (enabled: boolean) => void;
};

export type SmartRouterChainSection = {
  configuration: RouterConfigurationDetail | null;
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
  isDraft: boolean;
  isUpdatePending: boolean;
  onReorder: (entryId: string, targetOrder: number) => void;
  onRemove: (entryId: string) => void;
  onAdd: (input: ChainEntryInput) => void;
  onCreateDraft: () => void;
  isCreateDraftPending: boolean;
};

export type SmartRouterRevisionsSection = {
  revisions: RouterConfigurationSummary[];
  meta: { total: number; page: number; limit: number; totalPages: number };
  statusFilter: RouterConfigurationStatus | undefined;
  onStatusFilterChange: (status: RouterConfigurationStatus | undefined) => void;
  page: number;
  onPageChange: (page: number) => void;
  pageSize: number;
  onPageSizeChange: (size: number) => void;
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
  selectedRevisionId: string | null;
  onSelectRevision: (id: string) => void;
  onCreateDraft: () => void;
  isCreateDraftPending: boolean;
};

export type SmartRouterRevisionDetailSection = {
  configuration: RouterConfigurationDetail | null;
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
  isEditable: boolean;
  isUpdatePending: boolean;
  onReorder: (entryId: string, targetOrder: number) => void;
  onRemove: (entryId: string) => void;
  onAdd: (input: ChainEntryInput) => void;
};

export type SmartRouterPublishSection = {
  configuration: RouterConfigurationDetail | null;
  isLoading: boolean;
  currentlyPublished: RouterConfigurationSummary | null;
  isPublishable: boolean;
  isPending: boolean;
  onPublish: () => void;
};

export type SmartRouterCompareSection = {
  revisions: RouterConfigurationSummary[];
  fromId: string | null;
  toId: string | null;
  onFromChange: (id: string | null) => void;
  onToChange: (id: string | null) => void;
  diff: RouterConfigurationDiff | null;
  isLoading: boolean;
};

export type UseSmartRouterAdminPageResult = {
  t: TranslateFunction;
  locale: Locale;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  overview: SmartRouterOverviewSection;
  chain: SmartRouterChainSection;
  revisions: SmartRouterRevisionsSection;
  revisionDetail: SmartRouterRevisionDetailSection;
  publish: SmartRouterPublishSection;
  compare: SmartRouterCompareSection;
};

// ─── Component prop types ──────────────────────────────────────────────────────

export type SmartRouterStatusBadgeProps = {
  status: RouterConfigurationStatus;
  t: TranslateFunction;
};

export type SmartRouterOverviewTabProps = SmartRouterOverviewSection & {
  t: TranslateFunction;
};

export type SmartRouterChainEntryRowProps = {
  entry: RouterChainEntry;
  index: number;
  isFirst: boolean;
  isLast: boolean;
  isEditable: boolean;
  isDragSupported: boolean;
  isDragging: boolean;
  isDragTarget: boolean;
  isUpdatePending: boolean;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onRemove: () => void;
  onDragStart: (index: number) => void;
  onDragOver: (event: React.DragEvent, index: number) => void;
  onDragLeave: (event: React.DragEvent) => void;
  onDrop: (event: React.DragEvent, index: number) => void;
  onDragEnd: () => void;
  t: TranslateFunction;
};

export type SmartRouterChainEntryListProps = {
  entries: readonly RouterChainEntry[];
  isEditable: boolean;
  isUpdatePending: boolean;
  onReorder: (entryId: string, targetOrder: number) => void;
  onRemove: (entryId: string) => void;
  t: TranslateFunction;
};

export type SmartRouterAddEntryFormProps = {
  onAdd: (input: ChainEntryInput) => void;
  isPending: boolean;
  t: TranslateFunction;
};

export type SmartRouterChainTabProps = SmartRouterChainSection & {
  t: TranslateFunction;
};

export type SmartRouterRevisionRowProps = {
  revision: RouterConfigurationSummary;
  isSelected: boolean;
  onSelect: (id: string) => void;
  t: TranslateFunction;
};

export type SmartRouterRevisionsTabProps = SmartRouterRevisionsSection & {
  t: TranslateFunction;
};

export type SmartRouterRevisionDetailTabProps = SmartRouterRevisionDetailSection & {
  t: TranslateFunction;
};

export type SmartRouterPublishTabProps = SmartRouterPublishSection & {
  t: TranslateFunction;
};

export type UseSmartRouterPublishConfirmResult = {
  isOpen: boolean;
  open: () => void;
  close: () => void;
};

export type SmartRouterCompareDiffRowProps = {
  diffItem: RouterChainEntryDiffItem;
  t: TranslateFunction;
};

export type SmartRouterCompareTabProps = SmartRouterCompareSection & {
  t: TranslateFunction;
};

/** One row of the chain-entry model picker (mirrors the routing-service DTO). */
export type SelectableDeployment = {
  id: string;
  provider: RouterProvider;
  providerModelId: string;
  /** False for a model that exists but has not passed a validation yet. */
  isValidated: boolean;
};

export type UseSmartRouterSelectableDeploymentsResult = {
  deployments: readonly SelectableDeployment[];
  isLoading: boolean;
  isError: boolean;
};

/** A model job that runs beside routing rather than inside it. */
export const ASSISTANT_MODEL_ROLE_RESEARCH_GATE = 'RESEARCH_GATE';
export const ASSISTANT_MODEL_ROLE_FILE_WRITER = 'FILE_WRITER';

/** One configured candidate for an assistant model role. */
export type AssistantModelRecord = {
  id: string;
  role: string;
  order: number;
  enabled: boolean;
  provider: RouterProvider;
  modelAlias: string;
  deploymentId: string | null;
  timeoutMs: number;
  maxTokens: number;
};

export type AssistantModelInput = {
  provider: RouterProvider;
  modelAlias: string;
  deploymentId?: string;
  enabled: boolean;
  timeoutMs: number;
  maxTokens: number;
};

export type ReplaceAssistantModelsRequest = {
  entries: readonly AssistantModelInput[];
};

export type UseAssistantModelsResult = {
  entries: readonly AssistantModelRecord[];
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
  replace: (entries: readonly AssistantModelInput[]) => void;
  isReplacePending: boolean;
};

export type SmartRouterAssistantTabProps = {
  t: TranslateFunction;
};

export type SmartRouterAssistantRoleSectionProps = {
  role: string;
  titleKey: string;
  descriptionKey: string;
  emptyKey: string;
  t: TranslateFunction;
};

export type UseAssistantModelAddFormResult = {
  provider: RouterProvider;
  setProvider: (provider: RouterProvider) => void;
  modelAlias: string;
  setModelAlias: (modelAlias: string) => void;
  modelOptions: readonly SelectableDeployment[];
  buildInput: () => AssistantModelInput | null;
  reset: () => void;
};

export type SmartRouterAssistantAddFormProps = {
  onAdd: (input: AssistantModelInput) => void;
  isPending: boolean;
  t: TranslateFunction;
};
