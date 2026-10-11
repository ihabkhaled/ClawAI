import type { ReactNode } from 'react';

import type { FailureSort } from '@/enums/failure-sort.enum';
import type { ObservabilityTab } from '@/enums/observability-tab.enum';
import type { TracingDimension } from '@/enums/tracing-dimension.enum';
import type { TracingSort } from '@/enums/tracing-sort.enum';
import type { UsageBillingKind } from '@/enums/usage-billing-kind.enum';
import type { UsageCostKind } from '@/enums/usage-cost-kind.enum';
import type { UsageLeaderboardDimension } from '@/enums/usage-leaderboard-dimension.enum';
import type { UsageRangePreset } from '@/enums/usage-range-preset.enum';
import type { UsageSeriesGrain } from '@/enums/usage-series-grain.enum';
import type { UsageSortOrder } from '@/enums/usage-sort-order.enum';

import type { UsageRangeSelection, UsageSelectionIssue } from './admin-usage-analytics.types';
import type { TranslateFunction } from './i18n.types';

/* ---------- API shapes (auth-service /admin/usage-explorer, audit-service) ---------- */

/** The enum's values as a type, so a literal `'asc'` is accepted where the enum is meant. */
export type SortOrder = `${UsageSortOrder}`;

export type AdminUsageCostSummary = {
  costMicroUsd: string;
  actualMicroUsd: string;
  estimatedMicroUsd: string;
  costKind: UsageCostKind;
  pricedRequests: number;
  estimatedRequests: number;
  unpricedRequests: number;
  unmeteredRequests: number;
  partial: boolean;
};

export type AdminUsageMetrics = {
  requests: number;
  inputTokens: number;
  outputTokens: number;
  cachedTokens: number;
  cacheWriteTokens: number;
  reasoningTokens: number;
  weightedTokens: number;
  toolCalls: number;
  cost: AdminUsageCostSummary;
  creditRequests: number;
  allowanceRequests: number;
  creditSpendMicroUsd: string;
  lastSeenAt: string | null;
};

export type AdminUsageUserRow = AdminUsageMetrics & {
  userId: string;
  email: string | null;
  username: string | null;
  role: string | null;
};

export type AdminUsageGroupRow = AdminUsageMetrics & {
  key: string;
  label: string;
  provider: string | null;
  providerLabel: string | null;
  model: string | null;
  userId: string | null;
  email: string | null;
  username: string | null;
};

export type AdminUsagePage<T> = {
  from: string;
  to: string;
  generatedAt: string;
  sort: string;
  order: SortOrder;
  limit: number;
  items: T[];
  nextCursor: string | null;
};

export type AdminUsageUsersPage = AdminUsagePage<AdminUsageUserRow> & { matchedUsers: number };

export type AdminUsageLeaderboardPage = AdminUsagePage<AdminUsageGroupRow> & {
  dimension: UsageLeaderboardDimension;
};

export type AdminUsageSeriesPoint = AdminUsageMetrics & { bucketStart: string };

export type UsageGrain = `${UsageSeriesGrain}`;

export type AdminUsageTimeseries = {
  from: string;
  to: string;
  generatedAt: string;
  grain: UsageGrain;
  totals: AdminUsageMetrics;
  series: AdminUsageSeriesPoint[];
};

export type AdminUsageRequestRow = {
  id: string;
  at: string;
  provider: string;
  providerLabel: string;
  model: string;
  workflow: string;
  status: string;
  inputTokens: number;
  outputTokens: number;
  cachedTokens: number;
  cacheWriteTokens: number;
  reasoningTokens: number;
  weightedTokens: number;
  toolCalls: number;
  costMicroUsd: string;
  costKind: UsageCostKind;
  billing: UsageBillingKind;
};

export type AdminUsageRequestsPage = AdminUsagePage<AdminUsageRequestRow>;

export type AdminUsageFilterOptions = {
  providers: Array<{ value: string; label: string }>;
  models: string[];
  workflows: string[];
};

export type AdminUserConsumptionDetail = {
  user: { userId: string; email: string; username: string; role: string; status: string };
  from: string;
  to: string;
  generatedAt: string;
  grain: UsageGrain;
  filters: {
    provider: string | null;
    model: string | null;
    workflow: string | null;
    billing: UsageBillingKind | null;
  };
  totals: AdminUsageMetrics;
  models: AdminUsageGroupRow[];
  providers: AdminUsageGroupRow[];
  workflows: AdminUsageGroupRow[];
  breakdownTruncated: boolean;
  series: AdminUsageSeriesPoint[];
  heaviestRequests: AdminUsageRequestRow[];
  filterOptions: AdminUsageFilterOptions;
};

export type CountByKey = { key: string; label: string; count: number };

export type FailureGroup = {
  action: string;
  source: string;
  severity: string;
  isSyncNoise: boolean;
  count: number;
  lastSeenAt: string;
};

export type PagedItems<T> = {
  items: T[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
};

export type FailuresResponse = {
  from: string;
  to: string;
  hours: number;
  includeSync: boolean;
  totals: { failures: number; syncNoise: number };
  groups: PagedItems<FailureGroup>;
  bySource: CountByKey[];
  topProviders: CountByKey[];
  topModels: CountByKey[];
};

export type TracingRow = {
  key: string;
  label: string;
  provider: string | null;
  model: string | null;
  requests: number;
  measuredRequests: number;
  avgLatencyMs: number | null;
  p50LatencyMs: number | null;
  p95LatencyMs: number | null;
  totalTokens: number;
  providerReportedRequests: number;
  estimatedRequests: number;
  failureEvents: number | null;
  errorRate: number | null;
};

export type TracingResponse = {
  from: string;
  to: string;
  hours: number;
  dimension: TracingDimension;
  overall: {
    requests: number;
    measuredRequests: number;
    p50LatencyMs: number | null;
    p95LatencyMs: number | null;
  };
  rows: PagedItems<TracingRow>;
  signals: Array<{ action: string; count: number }>;
};

/* ---------- Query shapes ---------- */

export type ExplorerFilters = {
  provider: string;
  model: string;
  workflow: string;
  billing: string;
};

export type ExplorerParams = Record<string, string>;

export type ExplorerListQuery = {
  search?: string;
  sort?: string;
  order?: SortOrder;
  limit?: number;
  cursor?: string;
  dimension?: UsageLeaderboardDimension;
  userId?: string;
};

export type FailuresQuery = {
  hours: number;
  includeSync: boolean;
  search: string;
  sort: `${FailureSort}`;
  order: SortOrder;
  page: number;
  limit: number;
};

export type TracingQuery = {
  hours: number;
  dimension: TracingDimension;
  search: string;
  sort: `${TracingSort}`;
  order: SortOrder;
  page: number;
  limit: number;
};

/* ---------- Hook shapes ---------- */

export type ObservabilityScope = {
  /** The applied selection and filters. Used in query keys; the dates are rebuilt per request. */
  selection: UsageRangeSelection;
  filters: ExplorerFilters;
  /** Range plus filters as query params, rebuilt from the current clock on every call. */
  buildParams: () => ExplorerParams;
  /** The range alone (no filters): used to list every provider, model and workflow as filter choices. */
  buildRangeParams: () => ExplorerParams;
  /** Whole hours covered by the range, clamped to `maxHours`, for the hours-only endpoints. */
  buildHours: (maxHours: number) => { hours: number; clamped: boolean };
};

export type UseObservabilityFiltersReturn = {
  draft: UsageRangeSelection;
  filters: ExplorerFilters;
  issue: UsageSelectionIssue;
  scope: ObservabilityScope;
  setPreset: (preset: UsageRangePreset) => void;
  setHours: (value: string) => void;
  setCustomFrom: (value: string) => void;
  setCustomTo: (value: string) => void;
  setFilter: (name: keyof ExplorerFilters, value: string) => void;
  apply: () => void;
  clearFilters: () => void;
};

/** Cursors for pages 2..n, valid only while `contextKey` matches the current sort and filters. */
export type PagerStack = { contextKey: string; cursors: string[] };

export type CursorPagerState = {
  cursor: string | undefined;
  pageNumber: number;
  hasPrevious: boolean;
  goNext: (nextCursor: string | null) => void;
  goPrevious: () => void;
};

export type ObservabilityInitialState = {
  selection: UsageRangeSelection;
  filters: ExplorerFilters;
};

export type FilterOptionsQueryResult = {
  options: AdminUsageFilterOptions;
};

export type UseListControlsReturn = {
  searchDraft: string;
  search: string;
  sort: string;
  order: SortOrder;
  setSearchDraft: (value: string) => void;
  toggleSort: (column: string) => void;
};

/* ---------- Component props ---------- */

export type TProps = { t: TranslateFunction };

export type ExplorerTabProps = TProps & { scope: ObservabilityScope };

export type ObservabilityTabDefinition = {
  tab: ObservabilityTab;
  labelKey: string;
};

export type CostKindBadgeProps = TProps & {
  kind: UsageCostKind;
  partial?: boolean;
};

export type CostCellProps = TProps & {
  cost: { costMicroUsd: string; costKind: UsageCostKind; partial?: boolean };
};

export type MetricCardsProps = TProps & { totals: AdminUsageMetrics };

export type SortableHeadProps = {
  column: string;
  label: string;
  sort: string;
  order: SortOrder;
  /** Omit for a fixed-order list: the header is then plain text, not a button. */
  onSort?: (column: string) => void;
  alignEnd?: boolean;
};

export type CursorPagerProps = TProps & {
  pager: CursorPagerState;
  nextCursor: string | null;
  isFetching: boolean;
};

export type SearchBoxProps = {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
};

export type QueryStateProps = TProps & {
  isLoading: boolean;
  isError: boolean;
  isEmpty: boolean;
  onRetry: () => void;
  children: ReactNode;
};

export type UsersTableProps = TProps & {
  users: AdminUsageUserRow[];
  sort: string;
  order: SortOrder;
  onSort: (column: string) => void;
  onOpenUser: (userId: string) => void;
};

export type GroupTableProps = TProps & {
  rows: AdminUsageGroupRow[];
  firstColumnLabel: string;
  sort: string;
  order: SortOrder;
  onSort: (column: string) => void;
  onOpenUser?: (userId: string) => void;
  dimension: UsageLeaderboardDimension;
};

export type UserRequestsTableProps = TProps & {
  requests: AdminUsageRequestRow[];
  sort: string;
  order: SortOrder;
  /** Omit for a fixed-order list (the heaviest requests): headers are then plain text. */
  onSort?: (column: string) => void;
};

export type BreakdownTableProps = TProps & {
  rows: AdminUsageGroupRow[];
  heading: string;
  firstColumnLabel: string;
  dimension: UsageLeaderboardDimension;
  truncated: boolean;
};

export type UserConsumptionDialogProps = TProps & {
  userId: string | null;
  initialScope: ObservabilityScope;
  onClose: () => void;
};

export type ExplorerFiltersFormProps = TProps & {
  state: UseObservabilityFiltersReturn;
  options: AdminUsageFilterOptions;
};

export type FilterSelectProps = {
  id: string;
  label: string;
  value: string;
  allLabel: string;
  options: Array<{ value: string; label: string }>;
  onChange: (value: string) => void;
};

export type UserConsumptionBodyProps = TProps & {
  userId: string;
  initialScope: ObservabilityScope;
};

export type OpenUserTabProps = ExplorerTabProps & { onOpenUser: (userId: string) => void };

export type LeaderboardSectionProps = ExplorerTabProps & {
  dimension: UsageLeaderboardDimension;
  heading: string;
  firstColumnLabel: string;
  pageSize?: number;
  /** No search box or pager: a short "top N" list. */
  compact?: boolean;
  /** Draw a bar chart of cost above the table. */
  showChart?: boolean;
  onOpenUser?: (userId: string) => void;
};

export type TracingDimensionOption = { dimension: TracingDimension; labelKey: string };

/* ---------- Chart shapes ---------- */

export type ChartPoint = { label: string; value: number };

export type ChartSeries = { key: string; label: string; colorIndex: number; values: number[] };

export type LineChartProps = {
  points: ChartPoint[];
  ariaLabel: string;
  emptyLabel: string;
  formatValue: (value: number) => string;
};

export type BarDatum = { key: string; label: string; value: number; hint?: string };

export type HorizontalBarChartProps = {
  data: BarDatum[];
  ariaLabel: string;
  emptyLabel: string;
  formatValue: (value: number) => string;
};

export type StackedBarChartProps = {
  labels: string[];
  series: ChartSeries[];
  ariaLabel: string;
  emptyLabel: string;
  formatValue: (value: number) => string;
};

export type DonutSlice = { key: string; label: string; value: number };

export type DonutChartProps = {
  slices: DonutSlice[];
  ariaLabel: string;
  emptyLabel: string;
  formatValue: (value: number) => string;
};

export type DonutArc = {
  key: string;
  label: string;
  value: number;
  path: string;
  colorIndex: number;
  percent: number;
};
