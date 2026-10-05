/**
 * Admin usage analytics: per-user breakdown and platform-wide observability.
 *
 * Every figure is aggregated from rows the auth-service already owns
 * (`weighted_usage_records`, `feature_usage_records`, `credit_free_allowance_usage`).
 * Money is integer micro-USD carried as a decimal string (bigint server-side);
 * render it with `formatMicroUsd`, never parse it into a float.
 */

/** Bucket width of a time series: hourly up to 7 days, daily beyond. */
export type AdminUsageBucketGrain = 'HOUR' | 'DAY';

/** Counts for one slice of the ledger. */
export type AdminUsageTotals = {
  requests: number;
  inputTokens: number;
  outputTokens: number;
  weightedTokens: number;
  /** Provider cost, integer micro-USD as a decimal string (actual when settled, else estimated). */
  costMicroUsd: string;
};

/** One provider/model pair. `provider` is the connector the call went through. */
export type AdminUsageModelLine = AdminUsageTotals & {
  provider: string;
  model: string;
  /** Requests paid from the credit wallet (PAYG). */
  creditRequests: number;
  /** Requests absorbed by the plan's free credit-connector allowance. */
  freeAllowanceRequests: number;
};

/** One gated tool, counted when its result was delivered. */
export type AdminUsageToolLine = {
  /** PlanFeatureKey, e.g. WEB_SEARCH, WEB_FETCH, FILE_GENERATION. */
  tool: string;
  count: number;
};

/** One product surface (workflow) a request ran under, e.g. CHAT, COMPARE. */
export type AdminUsageWorkflowLine = {
  workflow: string;
  requests: number;
};

/** The user's free credit-connector allowance for the current UTC month. */
export type AdminFreeAllowanceUsage = {
  periodKey: string;
  /** `null` = unlimited, `0` = disabled; never interchangeable. */
  limit: number | null;
  used: number;
  /** `null` when unlimited. */
  remaining: number | null;
  resetsAt: string;
};

/** What the user did with credit-connector models in the window. */
export type AdminCreditConnectorUsage = {
  usedCreditConnectors: boolean;
  creditRequests: number;
  freeAllowanceRequests: number;
  /** Wallet money taken for these requests, integer micro-USD string. */
  walletMicroUsd: string;
  /** The same counter the user sees; current UTC month regardless of the window. */
  freeAllowance: AdminFreeAllowanceUsage | null;
};

/** `GET /admin/users/:userId/usage-breakdown` */
export type AdminUserUsageBreakdown = {
  userId: string;
  from: string;
  to: string;
  generatedAt: string;
  totals: AdminUsageTotals;
  models: AdminUsageModelLine[];
  tools: AdminUsageToolLine[];
  /** Sum of tool calls the model made in-turn; not named per tool. */
  toolCallCount: number;
  workflows: AdminUsageWorkflowLine[];
  creditConnector: AdminCreditConnectorUsage;
  /** True when the model list was cut at the page size. */
  modelsTruncated: boolean;
};

export type AdminUsageSeriesPoint = AdminUsageTotals & {
  /** Bucket start, ISO-8601 UTC. */
  bucketStart: string;
};

export type AdminUsageUserLine = AdminUsageTotals & {
  userId: string;
  /** Masked email, never the full address. */
  maskedEmail: string | null;
};

/** `GET /admin/usage-analytics` */
export type AdminUsageAnalytics = {
  from: string;
  to: string;
  generatedAt: string;
  grain: AdminUsageBucketGrain;
  /** Set when the view is filtered to one user. */
  userId: string | null;
  totals: AdminUsageTotals;
  /** USD consumed since 00:00 UTC today; independent of the selected range. */
  today: AdminUsageTotals;
  activeUsers: number;
  series: AdminUsageSeriesPoint[];
  models: AdminUsageModelLine[];
  /** Empty when filtered to one user. */
  topUsers: AdminUsageUserLine[];
  tools: AdminUsageToolLine[];
  workflows: AdminUsageWorkflowLine[];
  limit: number;
};
