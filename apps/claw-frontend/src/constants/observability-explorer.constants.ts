import { ObservabilityTab } from '@/enums/observability-tab.enum';
import { TracingDimension } from '@/enums/tracing-dimension.enum';
import { TracingSort } from '@/enums/tracing-sort.enum';
import { UsageBillingKind } from '@/enums/usage-billing-kind.enum';
import { UsageCostKind } from '@/enums/usage-cost-kind.enum';
import type {
  AdminUsageFilterOptions,
  ExplorerFilters,
  ObservabilityTabDefinition,
  TracingDimensionOption,
} from '@/types/observability-explorer.types';

/** Tab order. `Failures` needs ADMIN_SYSTEM_VIEW and is dropped for other admins. */
export const OBSERVABILITY_TABS: readonly ObservabilityTabDefinition[] = [
  { tab: ObservabilityTab.Overview, labelKey: 'observabilityExplorer.tabOverview' },
  { tab: ObservabilityTab.Consumption, labelKey: 'observabilityExplorer.tabConsumption' },
  { tab: ObservabilityTab.Models, labelKey: 'observabilityExplorer.tabModels' },
  { tab: ObservabilityTab.Users, labelKey: 'observabilityExplorer.tabUsers' },
  { tab: ObservabilityTab.Tracing, labelKey: 'observabilityExplorer.tabTracing' },
  { tab: ObservabilityTab.Failures, labelKey: 'observabilityExplorer.tabFailures' },
];

export const EMPTY_EXPLORER_FILTERS: ExplorerFilters = {
  provider: '',
  model: '',
  workflow: '',
  billing: '',
};

/** Sentinel for "no filter" in a Radix Select, which cannot hold an empty value. */
export const FILTER_ALL_VALUE = '__all__';

/** The workflow code the server uses for ledger rows with no workflow. */
export const UNKNOWN_WORKFLOW = 'UNKNOWN';

export const EXPLORER_PAGE_SIZE = 10;
export const REQUESTS_PAGE_SIZE = 10;
export const TABLE_PAGE_SIZE = 10;
export const SEARCH_DEBOUNCE_MS = 300;
export const SEARCH_MAX_LENGTH = 100;

/** audit-service tracing and failures accept at most 30 days. */
export const AUDIT_MAX_HOURS = 720;

export const BILLING_FILTER_OPTIONS: readonly { value: UsageBillingKind; labelKey: string }[] = [
  { value: UsageBillingKind.Credit, labelKey: 'observabilityExplorer.billingCredit' },
  { value: UsageBillingKind.Allowance, labelKey: 'observabilityExplorer.billingAllowance' },
  { value: UsageBillingKind.Unmetered, labelKey: 'observabilityExplorer.billingUnmetered' },
  { value: UsageBillingKind.Plan, labelKey: 'observabilityExplorer.billingPlan' },
];

export const COST_KIND_LABEL_KEYS: Record<UsageCostKind, string> = {
  [UsageCostKind.Priced]: 'observabilityExplorer.costPriced',
  [UsageCostKind.Fallback]: 'observabilityExplorer.costFallback',
  [UsageCostKind.Unpriced]: 'observabilityExplorer.costUnpriced',
  [UsageCostKind.Unmetered]: 'observabilityExplorer.costUnmetered',
};

export const COST_KIND_TIP_KEYS: Record<UsageCostKind, string> = {
  [UsageCostKind.Priced]: 'observabilityExplorer.costPricedTip',
  [UsageCostKind.Fallback]: 'observabilityExplorer.costFallbackTip',
  [UsageCostKind.Unpriced]: 'observabilityExplorer.costUnpricedTip',
  [UsageCostKind.Unmetered]: 'observabilityExplorer.costUnmeteredTip',
};

export const COST_KIND_BADGE_CLASSES: Record<UsageCostKind, string> = {
  [UsageCostKind.Priced]: 'border-success/40 bg-success/10 text-foreground',
  [UsageCostKind.Fallback]: 'border-warning/50 bg-warning/10 text-foreground',
  [UsageCostKind.Unpriced]: 'border-destructive/40 bg-destructive/10 text-foreground',
  [UsageCostKind.Unmetered]: 'border-border bg-muted text-foreground',
};

export const BILLING_LABEL_KEYS: Record<UsageBillingKind, string> = {
  [UsageBillingKind.Credit]: 'observabilityExplorer.billingCredit',
  [UsageBillingKind.Allowance]: 'observabilityExplorer.billingAllowance',
  [UsageBillingKind.Unmetered]: 'observabilityExplorer.billingUnmetered',
  [UsageBillingKind.Plan]: 'observabilityExplorer.billingPlan',
};

/** Chart series colours: theme tokens only, so dark mode follows the theme. */
export const CHART_COLORS: readonly string[] = [
  'hsl(var(--primary))',
  'hsl(var(--success))',
  'hsl(var(--warning))',
  'hsl(var(--destructive))',
  'hsl(var(--muted-foreground))',
];

export const CHART_WIDTH = 640;
export const CHART_HEIGHT = 220;
export const CHART_PADDING = 28;
export const DONUT_SIZE = 160;
export const DONUT_RADIUS = 60;
export const DONUT_STROKE = 26;
export const MAX_BAR_ROWS = 8;
export const MAX_X_LABELS = 6;

/** Page size is fixed on the audit-backed tables, so the size handler does nothing. */
export const IGNORE_PAGE_SIZE_CHANGE = (): void => undefined;

export const TRACING_DIMENSION_OPTIONS: readonly TracingDimensionOption[] = [
  { dimension: TracingDimension.Provider, labelKey: 'observabilityExplorer.tracingByProvider' },
  { dimension: TracingDimension.Model, labelKey: 'observabilityExplorer.tracingByModel' },
  { dimension: TracingDimension.Context, labelKey: 'observabilityExplorer.tracingByContext' },
];

export const CHART_PRIMARY_COLOR = 'hsl(var(--primary))';

/** Rows in the "top users" list on the Overview tab. */
export const TOP_USERS_LIMIT = 5;

/** Provider, model and workflow choices fetched for the filter selects (server cap 100). */
export const FILTER_OPTION_LIMIT = 100;
export const FILTER_OPTION_STALE_MS = 60_000;
export const NO_FILTER_OPTIONS: AdminUsageFilterOptions = {
  providers: [],
  models: [],
  workflows: [],
};

/** Sort columns the tracing endpoint accepts. */
export const TRACING_SORTS: readonly TracingSort[] = Object.values(TracingSort);
