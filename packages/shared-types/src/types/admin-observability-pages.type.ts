/**
 * Admin observability pages: the wire contract of `/api/v1/admin/observability/*`.
 *
 * Source of truth is auth-service `weighted_usage_records`. Money is integer
 * micro-USD carried as a decimal string (never a float); render it with
 * `formatMicroUsd`. Ratios and percentages are plain numbers because they are
 * display values, not billing amounts.
 *
 * Honest limits, repeated in the UI copy: "settle time" is `finalized_at -
 * created_at` (reserve to settle, queueing and tool loops included), NOT
 * provider latency; settle / refund rate is settled vs released holds, NOT an
 * HTTP success rate. Real latency and error codes live on the tracing and
 * failures pages (audit-service).
 */

export type AdminObsGrain = 'HOUR' | 'DAY';

export type AdminObsEntityKind = 'USER' | 'PROVIDER' | 'MODEL' | 'PLAN' | 'WORKFLOW';

export type AdminObsCostKind = 'PRICED' | 'FALLBACK' | 'UNPRICED' | 'UNMETERED';

export type AdminObsBillingKind = 'CREDIT' | 'ALLOWANCE' | 'UNMETERED' | 'PLAN';

export type AdminObsSortField =
  | 'requests'
  | 'tokens'
  | 'inputTokens'
  | 'outputTokens'
  | 'cost'
  | 'costPerRequest'
  | 'toolCalls'
  | 'activeDays'
  | 'lastSeen'
  | 'distinctUsers';

/** Cost block. `partial` means some rows carry no price, so the figure understates real spend. */
export type AdminObsCost = {
  costMicroUsd: string;
  actualMicroUsd: string;
  estimatedMicroUsd: string;
  costKind: AdminObsCostKind;
  pricedRequests: number;
  estimatedRequests: number;
  unpricedRequests: number;
  unmeteredRequests: number;
  partial: boolean;
};

export type AdminObsMetrics = {
  requests: number;
  inputTokens: number;
  outputTokens: number;
  cachedTokens: number;
  cacheWriteTokens: number;
  reasoningTokens: number;
  weightedTokens: number;
  toolCalls: number;
  cost: AdminObsCost;
  creditRequests: number;
  allowanceRequests: number;
  creditSpendMicroUsd: string;
  /** Cost the platform absorbed on free-allowance requests (integer micro-USD string). */
  allowanceCostMicroUsd: string;
  firstSeenAt: string | null;
  lastSeenAt: string | null;
  /** Distinct UTC days with at least one request. */
  activeDays: number;
  /** Distinct users behind the group. `null` when the dimension makes it meaningless. */
  distinctUsers: number | null;
  /** Distinct models behind the group (provider and user dimensions only). */
  distinctModels: number | null;
};

/** Values computed in the service, BigInt-safe for money. `null` = undefined (division by zero). */
export type AdminObsDerived = {
  /** Integer micro-USD string, rounded half up. */
  costPerRequestMicroUsd: string | null;
  costPer1kTokensMicroUsd: string | null;
  avgInputTokens: number | null;
  avgOutputTokens: number | null;
  toolCallsPerRequest: number | null;
  /** cached / (input + cached + cache write), 0..1. */
  cacheHitRate: number | null;
  /** reasoning / output. */
  reasoningShare: number | null;
  shareOfCostPct: number | null;
  shareOfRequestsPct: number | null;
  /** SUM(actual) / SUM(estimated) over rows that carry both. Null when no row has both. */
  estimateAccuracy: number | null;
};

/** Settled vs refunded holds plus reserve-to-settle time. Not an HTTP success rate. */
export type AdminObsHealth = {
  finalized: number;
  released: number;
  inFlight: number;
  /** RESERVED for more than 15 minutes: a hold that never settled or released. */
  staleReserved: number;
  settleRate: number | null;
  refundRate: number | null;
  avgSettleMs: number | null;
  p50SettleMs: number | null;
  p95SettleMs: number | null;
};

export type AdminObsEntityRow = {
  /** Stable group key: user id, provider key, `PROVIDER/model`, plan id or `NONE`, workflow key. */
  key: string;
  /** Display text. For a plan with no id the key is `NONE`; the UI localises it. Never a full email in a masked context. */
  label: string;
  kind: AdminObsEntityKind;
  userId: string | null;
  /** FULL address, only on the audited users list and export. Null everywhere else. */
  email: string | null;
  /** `ja***@example.com`, set wherever `email` is null for a user row. */
  maskedEmail: string | null;
  username: string | null;
  role: string | null;
  status: string | null;
  signedUpAt: string | null;
  provider: string | null;
  providerLabel: string | null;
  model: string | null;
  /** For a user row: their ACTIVE plan today. For a plan row: the plan. */
  planId: string | null;
  planName: string | null;
  metrics: AdminObsMetrics;
  derived: AdminObsDerived;
  /** Present on list pages and detail headers; null where it was not requested. */
  health: AdminObsHealth | null;
};

export type AdminObsStats = {
  metrics: AdminObsMetrics;
  derived: AdminObsDerived;
};

export type AdminObsPage = {
  from: string;
  to: string;
  generatedAt: string;
  grain: AdminObsGrain;
  sort: AdminObsSortField;
  order: 'asc' | 'desc';
  page: number;
  limit: number;
  /** Groups matching the filters and search, across every page. */
  total: number;
  pageCount: number;
  items: AdminObsEntityRow[];
  /** Whole-scope totals (ignores `search`), the denominator of every share. */
  totals: AdminObsStats;
};

export type AdminObsUsersExport = {
  from: string;
  to: string;
  generatedAt: string;
  items: AdminObsEntityRow[];
  /** True when more rows matched than the export cap; narrow the filters. */
  truncated: boolean;
  total: number;
};

export type AdminObsSeriesPoint = {
  bucketStart: string;
  requests: number;
  inputTokens: number;
  outputTokens: number;
  weightedTokens: number;
  toolCalls: number;
  costMicroUsd: string;
  activeUsers: number;
};

export type AdminObsActivityBucket = {
  /** Hour 0-23 (UTC) or ISO weekday 1 (Monday) - 7 (Sunday). */
  bucket: number;
  requests: number;
  costMicroUsd: string;
};

export type AdminObsSignupPoint = { bucketStart: string; count: number };

export type AdminObsBillingSplitLine = {
  billing: AdminObsBillingKind;
  requests: number;
  costMicroUsd: string;
};

export type AdminObsKpiDelta = {
  /** Integer string so a BigInt-sized figure never loses precision. */
  current: string;
  previous: string;
  /** Percent change, 2 decimals. Null when the previous period was zero. */
  changePct: number | null;
};

export type AdminObsOverview = {
  from: string;
  to: string;
  generatedAt: string;
  grain: AdminObsGrain;
  previousFrom: string;
  previousTo: string;
  totals: AdminObsStats;
  previousTotals: AdminObsStats;
  deltas: {
    requests: AdminObsKpiDelta;
    costMicroUsd: AdminObsKpiDelta;
    tokens: AdminObsKpiDelta;
    toolCalls: AdminObsKpiDelta;
    activeUsers: AdminObsKpiDelta;
  };
  activeUsers: number;
  /** Users whose first ever request fell inside the window. */
  firstTimeUsers: number;
  /** Accounts created in the window. Ignores the provider, model, plan and workflow filters. */
  newSignups: number;
  signupsSeries: AdminObsSignupPoint[];
  /** Distinct groups in the window, so every "View all N" link has a number. */
  counts: { providers: number; models: number; plans: number; workflows: number };
  health: AdminObsHealth;
  series: AdminObsSeriesPoint[];
  hourOfDay: AdminObsActivityBucket[];
  dayOfWeek: AdminObsActivityBucket[];
  billingSplit: AdminObsBillingSplitLine[];
};

/** Provider or model detail. Audit-sourced cards (latency, failures) are fetched by the frontend. */
export type AdminObsDetail = {
  from: string;
  to: string;
  generatedAt: string;
  grain: AdminObsGrain;
  entity: AdminObsEntityRow;
  series: AdminObsSeriesPoint[];
  hourOfDay: AdminObsActivityBucket[];
  billingSplit: AdminObsBillingSplitLine[];
  /** Provider detail only: its models, top 100 by cost. */
  models: AdminObsEntityRow[];
  /** Model detail only: the provider spellings that served it. */
  providers: AdminObsEntityRow[];
  /** Top 50 users by cost, emails masked. The full list is `/observability/users?provider=`. */
  users: AdminObsEntityRow[];
  plans: AdminObsEntityRow[];
  workflows: AdminObsEntityRow[];
  /** True when a block hit its cap. */
  truncated: boolean;
};

export type AdminObsFilterOptions = {
  providers: Array<{ value: string; label: string }>;
  models: string[];
  workflows: string[];
  /** `NONE` stands for requests with no plan on the ledger row. */
  plans: Array<{ value: string; label: string }>;
};

export type AdminObsHealthReport = {
  from: string;
  to: string;
  generatedAt: string;
  overall: AdminObsHealth;
  /** Providers ordered by refunded holds, most first. */
  byProvider: Array<{ key: string; label: string; health: AdminObsHealth }>;
};
