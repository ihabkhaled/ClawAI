import type {
  AdminCreditConnectorUsage,
  AdminUsageAnalytics,
  AdminUsageModelLine,
  AdminUsageSeriesPoint,
  AdminUsageToolLine,
  AdminUsageUserLine,
  AdminUsageWorkflowLine,
  AdminUserUsageBreakdown,
} from '@claw/shared-types';

import type { UsageRangePreset } from '@/enums/usage-range-preset.enum';

import type { TranslateFunction } from './i18n.types';

/** The query-string a usage endpoint accepts. Either `hours` or `from`/`to`, never both. */
export type UsageRangeQuery = {
  hours?: number;
  from?: string;
  to?: string;
};

export type UsageAnalyticsQuery = UsageRangeQuery & {
  userId?: string;
  limit?: number;
};

/** What the operator has chosen. `customFrom`/`customTo` are `YYYY-MM-DD` UTC dates. */
export type UsageRangeSelection = {
  preset: UsageRangePreset;
  hours: number;
  customFrom: string;
  customTo: string;
};

/** Translation key of the first problem with a selection, or null when it is valid. */
export type UsageSelectionIssue = string | null;

// ─── Hook returns ───────────────────────────────────────────────────────────

export type UseAdminUserUsageBreakdownReturn = {
  preset: UsageRangePreset;
  setPreset: (preset: UsageRangePreset) => void;
  breakdown: AdminUserUsageBreakdown | null;
  isLoading: boolean;
  isError: boolean;
  refetch: () => void;
};

/** The editable filter state and its handlers, shared by the hook and the filter form. */
export type UsageFilterState = {
  draft: UsageRangeSelection;
  userIdDraft: string;
  issue: UsageSelectionIssue;
  setPreset: (preset: UsageRangePreset) => void;
  setHours: (value: string) => void;
  setCustomFrom: (value: string) => void;
  setCustomTo: (value: string) => void;
  setUserIdDraft: (value: string) => void;
  apply: () => void;
  clearUser: () => void;
};

export type UseUsageAnalyticsReturn = UsageFilterState & {
  /** False when the actor lacks ADMIN_USAGE_VIEW: the section renders nothing. */
  canView: boolean;
  applied: UsageRangeSelection;
  appliedUserId: string;
  analytics: AdminUsageAnalytics | null;
  isLoading: boolean;
  isError: boolean;
  refetch: () => void;
};

// ─── Component props ────────────────────────────────────────────────────────

export type UsageRangePickerProps = {
  presets: readonly UsageRangePreset[];
  value: UsageRangePreset;
  onChange: (preset: UsageRangePreset) => void;
  t: TranslateFunction;
};

export type UserUsageBreakdownSectionProps = {
  userId: string;
  t: TranslateFunction;
};

export type UserUsageModelsTableProps = {
  models: AdminUsageModelLine[];
  truncated: boolean;
  t: TranslateFunction;
};

export type UsageToolsListProps = {
  tools: AdminUsageToolLine[];
  toolCallCount?: number;
  heading: string;
  t: TranslateFunction;
};

export type UsageWorkflowsListProps = {
  workflows: AdminUsageWorkflowLine[];
  heading: string;
};

export type UserUsageCreditConnectorCardProps = {
  credit: AdminCreditConnectorUsage;
  t: TranslateFunction;
};

export type UsageAnalyticsFiltersProps = {
  state: UsageFilterState;
  t: TranslateFunction;
};

export type UsageAnalyticsSummaryProps = {
  analytics: AdminUsageAnalytics;
  t: TranslateFunction;
};

export type UsageSeriesChartProps = {
  series: AdminUsageSeriesPoint[];
  grain: AdminUsageAnalytics['grain'];
  t: TranslateFunction;
};

export type UsageModelsTableProps = {
  models: AdminUsageModelLine[];
  t: TranslateFunction;
};

export type UsageTopUsersTableProps = {
  users: AdminUsageUserLine[];
  t: TranslateFunction;
};
