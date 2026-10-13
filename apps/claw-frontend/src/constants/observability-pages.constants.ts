import type {
  AdminObsBillingKind,
  AdminObsCostKind,
  AdminObsFilterOptions,
} from '@claw/shared-types';
import { ArrowDown, ArrowUp, Minus } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

import { ObservabilityChangeDirection } from '@/enums/observability-change-direction.enum';
import { ObservabilityDetailKind } from '@/enums/observability-detail-kind.enum';
import { ObservabilityPage } from '@/enums/observability-page.enum';
import { ObservabilityPeriod } from '@/enums/observability-period.enum';
import { UsageBillingKind } from '@/enums/usage-billing-kind.enum';
import { UsageCostKind } from '@/enums/usage-cost-kind.enum';
import { UserRole } from '@/enums/user-role.enum';
import { UserStatus } from '@/enums/user-status.enum';
import type { ObservabilityEntityKind } from '@/types/observability-pages-api.types';
import type {
  EntityColumn,
  ObservabilityNavItem,
  ObservabilityPeriodOption,
  ObservabilityUrlState,
} from '@/types/observability-pages.types';

import { ROUTES } from './routes.constants';

/** Sub-navigation, in display order. `permission` gates items that need more than usage view. */
export const OBSERVABILITY_NAV_ITEMS: readonly ObservabilityNavItem[] = [
  {
    page: ObservabilityPage.Hub,
    href: ROUTES.OBSERVABILITY,
    labelKey: 'observabilityPages.navHub',
    requiresSystemView: true,
  },
  {
    page: ObservabilityPage.Users,
    href: ROUTES.OBSERVABILITY_USERS,
    labelKey: 'observabilityPages.navUsers',
  },
  {
    page: ObservabilityPage.Providers,
    href: ROUTES.OBSERVABILITY_PROVIDERS,
    labelKey: 'observabilityPages.navProviders',
  },
  {
    page: ObservabilityPage.Models,
    href: ROUTES.OBSERVABILITY_MODELS,
    labelKey: 'observabilityPages.navModels',
  },
  {
    page: ObservabilityPage.Plans,
    href: ROUTES.OBSERVABILITY_PLANS,
    labelKey: 'observabilityPages.navPlans',
  },
  {
    page: ObservabilityPage.Surfaces,
    href: ROUTES.OBSERVABILITY_SURFACES,
    labelKey: 'observabilityPages.navSurfaces',
  },
  {
    page: ObservabilityPage.Consumption,
    href: ROUTES.OBSERVABILITY_CONSUMPTION,
    labelKey: 'observabilityPages.navConsumption',
  },
  {
    page: ObservabilityPage.Tracing,
    href: ROUTES.OBSERVABILITY_TRACING,
    labelKey: 'observabilityPages.navTracing',
  },
  {
    page: ObservabilityPage.Failures,
    href: ROUTES.OBSERVABILITY_FAILURES,
    labelKey: 'observabilityPages.navFailures',
    requiresSystemView: true,
  },
];

export const OBSERVABILITY_PERIOD_OPTIONS: readonly ObservabilityPeriodOption[] = [
  { period: ObservabilityPeriod.Today, labelKey: 'observabilityPages.periodToday' },
  { period: ObservabilityPeriod.Last24Hours, labelKey: 'observabilityPages.period24h' },
  { period: ObservabilityPeriod.Last7Days, labelKey: 'observabilityPages.period7d' },
  { period: ObservabilityPeriod.Last30Days, labelKey: 'observabilityPages.period30d' },
  { period: ObservabilityPeriod.Last90Days, labelKey: 'observabilityPages.period90d' },
  { period: ObservabilityPeriod.Custom, labelKey: 'observabilityPages.periodCustom' },
];

export const NO_PAGE_FILTER_OPTIONS: AdminObsFilterOptions = {
  providers: [],
  models: [],
  workflows: [],
  plans: [],
};

export const DEFAULT_OBSERVABILITY_PERIOD = ObservabilityPeriod.Last7Days;

export const EMPTY_OBSERVABILITY_URL_STATE: ObservabilityUrlState = {
  period: DEFAULT_OBSERVABILITY_PERIOD,
  from: '',
  to: '',
  provider: '',
  model: '',
  plan: '',
  workflow: '',
  billing: '',
  user: '',
};

/** URL keys shared by every page (kept in the sub-navigation links). */
export const SHARED_URL_KEYS: readonly (keyof ObservabilityUrlState)[] = [
  'period',
  'from',
  'to',
  'provider',
  'model',
  'plan',
  'workflow',
  'billing',
];

/**
 * URL keys dropped whenever the period or a filter changes: only the page number,
 * which no longer points at the same rows. Search, sort, order and page size are
 * the operator's view of the table and survive a filter change.
 */
export const PAGE_URL_KEYS: readonly string[] = ['page'];

export const TOP_PARAM = 'top';
export const TOP_PREVIEW_CHOICES: readonly number[] = [5, 10, 25, 50];
export const DEFAULT_TOP_PREVIEW = 10;

/** Plan filter value for requests with no plan on the ledger row. */
export const NO_PLAN_FILTER = 'NONE';

/** Base path of the observability endpoints (auth-service, ADMIN_USAGE_VIEW). */
export const OBSERVABILITY_API_BASE = '/admin/observability';

/** Weekday names for the day-of-week chart, Monday first (ISO order). */
export const WEEKDAY_LABEL_KEYS: readonly string[] = [
  'observabilityPages.weekdayMon',
  'observabilityPages.weekdayTue',
  'observabilityPages.weekdayWed',
  'observabilityPages.weekdayThu',
  'observabilityPages.weekdayFri',
  'observabilityPages.weekdaySat',
  'observabilityPages.weekdaySun',
];

export const CSV_EXPORT_FILE_NAME = 'observability-users.csv';

/** Columns the users endpoint sorts by. */
export const USER_SORT_COLUMNS: readonly string[] = [
  'requests',
  'tokens',
  'inputTokens',
  'outputTokens',
  'cost',
  'costPerRequest',
  'toolCalls',
  'activeDays',
  'lastSeen',
];

/** Columns the provider, model, plan and surface endpoints sort by. */
export const ENTITY_SORT_COLUMNS: readonly string[] = [
  'requests',
  'tokens',
  'cost',
  'costPerRequest',
  'distinctUsers',
  'lastSeen',
];

/** Rows fetched for the hub previews are the chosen `top`; entities sort by cost, users by cost too. */
export const PREVIEW_SORT = 'cost';

/** CSV columns, in order; each is a translation key under `observabilityPages.csv*`. */
export const USERS_CSV_COLUMNS: readonly string[] = [
  'observabilityPages.csvUserId',
  'observabilityPages.csvEmail',
  'observabilityPages.csvUsername',
  'observabilityPages.csvRole',
  'observabilityPages.csvRequests',
  'observabilityPages.csvInputTokens',
  'observabilityPages.csvOutputTokens',
  'observabilityPages.csvCachedTokens',
  'observabilityPages.csvToolCalls',
  'observabilityPages.csvCostUsd',
  'observabilityPages.csvCostKind',
  'observabilityPages.csvLastSeen',
];

const col = (
  id: EntityColumn['id'],
  labelKey: string,
  sort?: string,
  alignEnd = false,
): EntityColumn =>
  sort === undefined ? { id, labelKey, alignEnd } : { id, labelKey, sort, alignEnd };

const REQUESTS = col('requests', 'usageAnalytics.colRequests', 'requests', true);
const TOKENS = col('tokens', 'usageAnalytics.colTokens', 'tokens', true);
const COST = col('cost', 'usageAnalytics.colCost', 'cost', true);
const COST_PER_REQUEST = col(
  'costPerRequest',
  'observabilityPages.colCostPerRequest',
  'costPerRequest',
  true,
);
const LAST_SEEN = col('lastSeen', 'observabilityExplorer.colLastSeen', 'lastSeen');
const DISTINCT_USERS = col('distinctUsers', 'observabilityPages.colUsers', 'distinctUsers', true);
const SHARE_OF_COST = col('shareOfCost', 'observabilityPages.colShareOfCost', undefined, true);
const BILLING = col('billing', 'observabilityPages.colBilling', undefined, true);
const ALLOWANCE_COST = col('allowanceCost', 'observabilityPages.colAllowanceCost', undefined, true);
const SETTLE_RATE = col('settleRate', 'observabilityPages.colSettleRate', undefined, true);
const REFUND_RATE = col('refundRate', 'observabilityPages.colRefundRate', undefined, true);
const SETTLE_P95 = col('settleP95', 'observabilityPages.colSettleP95', undefined, true);

/** The columns of each list, in order. Only server-sortable columns carry a `sort`. */
export const ENTITY_COLUMNS: Readonly<Record<ObservabilityEntityKind, readonly EntityColumn[]>> = {
  users: [
    col('name', 'usageAnalytics.colUser'),
    col('role', 'observabilityExplorer.colRole'),
    col('status', 'observabilityPages.colStatus'),
    col('plan', 'observabilityPages.colCurrentPlan'),
    col('signedUp', 'observabilityPages.colSignedUp'),
    REQUESTS,
    col('inputTokens', 'observabilityPages.colInputTokens', 'inputTokens', true),
    col('outputTokens', 'observabilityPages.colOutputTokens', 'outputTokens', true),
    col('cachedTokens', 'observabilityPages.colCachedTokens', undefined, true),
    col('toolCalls', 'observabilityPages.colToolCalls', 'toolCalls', true),
    COST,
    COST_PER_REQUEST,
    BILLING,
    ALLOWANCE_COST,
    col('activeDays', 'observabilityPages.colActiveDays', 'activeDays', true),
    col('firstSeen', 'observabilityPages.colFirstSeen'),
    LAST_SEEN,
  ],
  providers: [
    col('name', 'observabilityExplorer.colProvider'),
    REQUESTS,
    TOKENS,
    COST,
    COST_PER_REQUEST,
    SHARE_OF_COST,
    DISTINCT_USERS,
    col('distinctModels', 'observabilityPages.colModels', undefined, true),
    SETTLE_RATE,
    REFUND_RATE,
    SETTLE_P95,
    LAST_SEEN,
  ],
  models: [
    col('name', 'usageAnalytics.colModel'),
    col('provider', 'observabilityExplorer.colProvider'),
    REQUESTS,
    TOKENS,
    COST,
    COST_PER_REQUEST,
    SHARE_OF_COST,
    col('cacheHitRate', 'observabilityPages.colCacheHit', undefined, true),
    DISTINCT_USERS,
    SETTLE_RATE,
    SETTLE_P95,
    LAST_SEEN,
  ],
  plans: [
    col('name', 'observabilityPages.colPlan'),
    DISTINCT_USERS,
    REQUESTS,
    TOKENS,
    COST,
    COST_PER_REQUEST,
    SHARE_OF_COST,
    BILLING,
    ALLOWANCE_COST,
    SETTLE_RATE,
    LAST_SEEN,
  ],
  workflows: [
    col('name', 'observabilityPages.colSurface'),
    DISTINCT_USERS,
    REQUESTS,
    TOKENS,
    COST,
    COST_PER_REQUEST,
    SHARE_OF_COST,
    BILLING,
    ALLOWANCE_COST,
    SETTLE_RATE,
    LAST_SEEN,
  ],
};

/** Billing split labels, keyed by the wire value. */
export const OBS_BILLING_LABEL_KEYS: Readonly<Record<AdminObsBillingKind, string>> = {
  CREDIT: 'observabilityExplorer.billingCredit',
  ALLOWANCE: 'observabilityExplorer.billingAllowance',
  UNMETERED: 'observabilityExplorer.billingUnmetered',
  PLAN: 'observabilityExplorer.billingPlan',
};

/** The columns a hub preview keeps; the full list page shows them all. */
export const COMPACT_COLUMN_IDS: readonly EntityColumn['id'][] = [
  'name',
  'provider',
  'requests',
  'tokens',
  'cost',
  'shareOfCost',
  'distinctUsers',
  'lastSeen',
];

/** Icon per direction of change against the previous period. */
export const DELTA_ICONS: Readonly<Record<ObservabilityChangeDirection, LucideIcon>> = {
  [ObservabilityChangeDirection.Up]: ArrowUp,
  [ObservabilityChangeDirection.Down]: ArrowDown,
  [ObservabilityChangeDirection.Flat]: Minus,
};

/** Look and focus ring of a link inside a table cell or a card header. */
export const ENTITY_LINK_CLASS =
  'text-primary focus-visible:ring-ring rounded-sm font-medium break-all underline-offset-4 hover:underline focus-visible:ring-2 focus-visible:outline-none';

/** Rows asked of the audit tracing when looking one provider or model up by name. */
export const AUDIT_LOOKUP_LIMIT = 10;

/** The URL keys that are filters (not the period). Clearing filters removes exactly these. */
export const FILTER_URL_KEYS = ['provider', 'model', 'plan', 'workflow', 'billing'] as const;

/** Multiplier from a 0..1 ratio to a percentage. */
export const PERCENT = 100;

/** The wire cost kind as the enum the shared cost badge takes. */
export const COST_KINDS: Readonly<Record<AdminObsCostKind, UsageCostKind>> = {
  PRICED: UsageCostKind.Priced,
  FALLBACK: UsageCostKind.Fallback,
  UNPRICED: UsageCostKind.Unpriced,
  UNMETERED: UsageCostKind.Unmetered,
};

/** Hours in a day, and days in a week: the sizes of the zero-filled activity charts. */
export const HOURS = 24;
export const WEEKDAYS = 7;

/** A `YYYY-MM-DD` date as the URL carries it. */
export const DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/u;

/** Wire values the URL may carry for `period` and `billing`; anything else is dropped. */
export const PERIODS: readonly string[] = Object.values(ObservabilityPeriod);
export const BILLING_KINDS: readonly string[] = Object.values(UsageBillingKind);

/** Longest value read from any URL parameter. */
export const MAX_PARAM_LENGTH = 200;

/** Days behind each rolling period; the server clamps to its own clock. */
export const ROLLING_DAYS: Partial<Record<ObservabilityPeriod, number>> = {
  [ObservabilityPeriod.Last7Days]: 7,
  [ObservabilityPeriod.Last30Days]: 30,
  [ObservabilityPeriod.Last90Days]: 90,
};

/** A cell a spreadsheet would run as a formula, and a cell that must be quoted in CSV. */
export const FORMULA_START = /^[=+\-@\t\r]/u;
export const NEEDS_QUOTES = /[",\n\r]/u;

/** U+FEFF: the first character of a CSV so a spreadsheet opens it as UTF-8. */
export const CSV_BYTE_ORDER_MARK = '\uFEFF';

/** Translation of each account role, by wire value. An unknown role is shown as it came. */
export const ROLE_LABEL_KEYS: Readonly<Record<string, string>> = {
  [UserRole.ADMIN]: 'admin.roleAdmin',
  [UserRole.USER]: 'admin.roleUser',
  [UserRole.OPERATOR]: 'admin.roleOperator',
  [UserRole.VIEWER]: 'admin.roleViewer',
};

/** Translation of each account status, by wire value. An unknown status is shown as it came. */
export const STATUS_LABEL_KEYS: Readonly<Record<string, string>> = {
  [UserStatus.ACTIVE]: 'observabilityPages.statusActive',
  [UserStatus.SUSPENDED]: 'observabilityPages.statusSuspended',
  [UserStatus.PENDING]: 'observabilityPages.statusPending',
};

/** What a detail page asks the operator to choose when the link names no provider or model. */
export const DETAIL_CHOICE_KEYS: Readonly<
  Record<ObservabilityDetailKind, { titleKey: string; hintKey: string }>
> = {
  [ObservabilityDetailKind.Provider]: {
    titleKey: 'observabilityPages.chooseProviderTitle',
    hintKey: 'observabilityPages.chooseProviderHint',
  },
  [ObservabilityDetailKind.Model]: {
    titleKey: 'observabilityPages.chooseModelTitle',
    hintKey: 'observabilityPages.chooseModelHint',
  },
};
