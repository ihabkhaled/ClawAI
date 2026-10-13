import { type Prisma } from '../../../generated/prisma';
import {
  type ObservabilityEntity,
  type ObservabilitySortField,
} from '../enums/usage-cost-kind.enum';
import { type AdminUsageRange } from './admin-usage-analytics.types';
import {
  type ExplorerScope,
  type ExplorerScopeInput,
  type ExplorerSumsRow,
} from './admin-usage-explorer.types';

/** Explorer filters plus the plan filter (`NONE` = requests with no plan on the ledger row). */
export type ObservabilityScope = ExplorerScope & { plan: string | null };

/** Aggregate row of every observability query: the explorer sums plus the extra columns. */
export type ObservabilitySumsRow = ExplorerSumsRow & {
  first_seen_at: Date | null;
  active_days: number;
  allowance_cost_micro_usd: string;
  accuracy_actual_micro_usd: string;
  accuracy_estimated_micro_usd: string;
};

/** SQL pieces that differ per entity. Static fragments: no caller text is ever interpolated. */
export type ObservabilityDimensionSql = {
  key: Prisma.Sql;
  groupBy: Prisma.Sql;
  /** Always the same columns, in the same order, so one row type fits every entity. */
  extras: Prisma.Sql;
};

/** The entity and search text of a grouped query: all `countGroups` needs besides the scope. */
export type ObservabilityGroupTarget = Pick<ObservabilityEntityPageQuery, 'entity' | 'search'>;

/** One grouped row. Every entity returns every column; the ones that do not apply are NULL. */
export type ObservabilityGroupRow = ObservabilitySumsRow & {
  group_key: string;
  sort_val: string;
  total_groups: number;
  email: string | null;
  username: string | null;
  role: string | null;
  status: string | null;
  user_created_at: Date | null;
  raw_provider: string | null;
  model: string | null;
  plan_id: string | null;
  plan_name: string | null;
  distinct_users: number | null;
  distinct_models: number | null;
};

export type ObservabilityBucketRow = ObservabilitySumsRow & {
  bucket_start: Date;
  active_users: number;
};

export type ObservabilityHealthRow = {
  group_key: string | null;
  finalized: number;
  released: number;
  in_flight: number;
  stale_reserved: number;
  avg_ms: number | null;
  p50_ms: number | null;
  p95_ms: number | null;
};

export type ObservabilityEntityPageQuery = {
  scope: ObservabilityScope;
  entity: ObservabilityEntity;
  search: string | null;
  sort: ObservabilitySortField;
  descending: boolean;
  limit: number;
  offset: number;
};

export type ObservabilityActivityRow = { bucket: number; requests: number; cost_micro_usd: string };
export type ObservabilityBillingRow = { billing: string; requests: number; cost_micro_usd: string };
export type ObservabilitySignupRow = { bucket_start: Date; total: number };
export type ObservabilityPeopleRow = { active_users: number; first_time_users: number };
export type ObservabilityCountsRow = {
  providers: number;
  models: number;
  plans: number;
  workflows: number;
};
export type ObservabilityPlanOptionRow = { id: string; name: string };

/** Whole-scope denominators every share is taken against. */
export type ObservabilityShareBase = { costMicroUsd: bigint; requests: number };

/** What a caller may send before it is resolved against "now": the explorer input plus plan and user. */
export type ObservabilityScopeInput = ExplorerScopeInput & {
  plan?: string | undefined;
  userId?: string | undefined;
};

export type ObservabilityResolvedScope = {
  scope: ObservabilityScope;
  range: AdminUsageRange;
  now: Date;
};

/** The first overview batch: both periods' totals and people, and the signups. */
export type ObservabilityOverviewPeriods = {
  totals: ObservabilitySumsRow | undefined;
  previousTotals: ObservabilitySumsRow | undefined;
  people: ObservabilityPeopleRow | undefined;
  previousPeople: ObservabilityPeopleRow | undefined;
  newSignups: number;
  signups: ObservabilitySignupRow[];
};

/** The second overview batch: counts, health, series and the activity splits. */
export type ObservabilityOverviewBreakdown = {
  counts: ObservabilityCountsRow | undefined;
  health: ObservabilityHealthRow[];
  series: ObservabilityBucketRow[];
  hourOfDay: ObservabilityActivityRow[];
  dayOfWeek: ObservabilityActivityRow[];
  billing: ObservabilityBillingRow[];
};

/** The second detail batch: the billing split and the five breakdown blocks (one extra row each). */
export type ObservabilityDetailSplits = {
  billing: ObservabilityBillingRow[];
  models: ObservabilityGroupRow[];
  providers: ObservabilityGroupRow[];
  users: ObservabilityGroupRow[];
  plans: ObservabilityGroupRow[];
  workflows: ObservabilityGroupRow[];
};
