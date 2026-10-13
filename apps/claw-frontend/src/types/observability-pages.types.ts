import type {
  AdminObsDetail,
  AdminObsEntityRow,
  AdminObsFilterOptions,
  AdminObsHealth,
  AdminObsHealthReport,
  AdminObsKpiDelta,
  AdminObsOverview,
} from '@claw/shared-types';
import type { ReactNode } from 'react';

import type { ObservabilityColumn } from '@/enums/observability-column.enum';
import type { ObservabilityPage } from '@/enums/observability-page.enum';
import type { ObservabilityPeriod } from '@/enums/observability-period.enum';

import type { UsageSelectionIssue } from './admin-usage-analytics.types';
import type { ObservabilityScope, SortOrder, TProps } from './observability-explorer.types';
import type { ObservabilityEntityKind } from './observability-pages-api.types';

/** Everything the shared filter bar keeps in the URL. Empty string means "not set". */
export type ObservabilityUrlState = {
  period: ObservabilityPeriod;
  /** `YYYY-MM-DD` UTC, only meaningful when `period` is custom. */
  from: string;
  to: string;
  provider: string;
  model: string;
  plan: string;
  workflow: string;
  billing: string;
  /** The user whose consumption dialog is open. */
  user: string;
};

/** Any `?key=value` source: `URLSearchParams` and Next's `ReadonlyURLSearchParams`. */
export type SearchParamsReader = { get: (name: string) => string | null; toString: () => string };

export type ObservabilityNavItem = {
  page: ObservabilityPage;
  href: string;
  labelKey: string;
  requiresSystemView?: boolean;
};

export type ObservabilityPeriodOption = { period: ObservabilityPeriod; labelKey: string };

/** A write to the URL: a key mapped to its new value, `null` or '' removes it. */
export type UrlUpdates = Record<string, string | null>;

export type ObservabilityPagesContextValue = {
  state: ObservabilityUrlState;
  scope: ObservabilityScope;
  options: AdminObsFilterOptions;
  /** True when the URL carries an invalid custom range (it is not sent). */
  issue: UsageSelectionIssue;
  /** The query string of the shared keys, to append to links between pages. */
  sharedQuery: string;
  setParams: (updates: UrlUpdates, options?: { keepPage?: boolean }) => void;
  setPeriod: (period: ObservabilityPeriod) => void;
  setFilter: (name: keyof ObservabilityUrlState, value: string) => void;
  clearFilters: () => void;
  openUser: (userId: string) => void;
  closeUser: () => void;
  param: (name: string) => string;
};

/** The text of a URL-mirrored search box, and its setter. */
export type UrlSearchDraft = { draft: string; setDraft: (value: string) => void };

/** Search, sort and page size read from and written to the URL for one table. */
export type UseUrlListControlsReturn = {
  searchDraft: string;
  search: string;
  sort: string;
  order: SortOrder;
  limit: number;
  page: number;
  setSearchDraft: (value: string) => void;
  toggleSort: (column: string) => void;
  setLimit: (limit: number) => void;
  setPage: (page: number) => void;
  goToFirstPage: () => void;
};

export type ObservabilityNavProps = TProps & { canViewSystem: boolean; sharedQuery: string };

export type ObservabilityFilterBarProps = TProps & {
  scope: ObservabilityPagesContextValue;
  /** True on a provider's detail page, where the server ignores the provider and model filters. */
  hideProviderModel?: boolean;
};

export type PastEndNoticeProps = TProps & { onBack: () => void };

/** What a table cell shows. One id per column, rendered by `EntityCell`. */
/** The column ids as a type, so a literal `'name'` is accepted where the enum is meant. */
export type EntityColumnId = `${ObservabilityColumn}`;

export type EntityColumn = {
  id: EntityColumnId;
  labelKey: string;
  /** The server sort field. Omit for a column the server cannot order by. */
  sort?: string;
  alignEnd?: boolean;
};

export type EntityTableProps = TProps & {
  kind: ObservabilityEntityKind;
  rows: AdminObsEntityRow[];
  sort: string;
  order: SortOrder;
  /** Omit for a fixed-order list (a detail page block): headers are then plain text. */
  onSort?: (column: string) => void;
  /** Keep only the headline columns (a hub preview). */
  compact?: boolean;
  onOpenUser: (userId: string) => void;
  sharedQuery: string;
};

export type EntityCellProps = TProps & {
  column: EntityColumn;
  row: AdminObsEntityRow;
  onOpenUser: (userId: string) => void;
  sharedQuery: string;
};

export type ObservabilityListPageProps = TProps & {
  kind: ObservabilityEntityKind;
  title: string;
  searchLabel: string;
  /** Short note under the title: what a row is, and any honest limit on the figures. */
  note: string;
};

export type KpiGridProps = TProps & { overview: AdminObsOverview };

export type HealthCardProps = TProps & { health: AdminObsHealth };

export type OverviewChartsProps = TProps & { overview: AdminObsOverview };

export type PreviewSectionProps = TProps & {
  kind: ObservabilityEntityKind;
  title: string;
  top: number;
  viewAllHref: string;
  viewAllLabel: string;
  onOpenUser: (userId: string) => void;
  sharedQuery: string;
};

export type EntityDetailViewProps = TProps & {
  detail: AdminObsDetail;
  /** The provider (and model) the audit cards look up. */
  provider: string;
  model: string | null;
  sharedQuery: string;
  onOpenUser: (userId: string) => void;
};

export type DetailFrameProps = TProps & {
  detail: AdminObsDetail | null;
  isLoading: boolean;
  isError: boolean;
  onRetry: () => void;
  provider: string;
  model: string | null;
  backHref: string;
  backLabel: string;
};

export type DeltaLineProps = TProps & { delta: AdminObsKpiDelta };

export type KpiCardProps = TProps & { title: string; value: string; delta: AdminObsKpiDelta };

export type ChartCardProps = { title: string; description?: string; children: ReactNode };

export type TopSizePickerProps = TProps & { value: number; onChange: (value: number) => void };

export type DetailSectionProps = TProps & { detail: AdminObsDetail };

export type DetailSplitsProps = DetailSectionProps & {
  provider: string;
  model: string | null;
  sharedQuery: string;
  onOpenUser: (userId: string) => void;
};

export type AuditLatencyCardProps = TProps & { provider: string; model: string | null };

export type ProviderDetailPageProps = { provider: string };

export type RefundedHoldsCardProps = TProps & { report: AdminObsHealthReport };
