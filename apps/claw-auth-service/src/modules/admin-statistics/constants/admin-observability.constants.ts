import { Prisma } from '../../../generated/prisma';
import {
  EXPLORER_FROM_SQL,
  EXPLORER_SUMS_SQL,
  ROW_COST_SQL,
} from './admin-usage-explorer.constants';
import { ObservabilityEntity, ObservabilitySortField } from '../enums/usage-cost-kind.enum';
import {
  type ObservabilityDimensionSql,
  type ObservabilitySumsRow,
} from '../types/admin-observability.types';

/** Rows per page when the caller sends no `limit`, and the hard ceiling. */
export const OBS_DEFAULT_LIMIT = 25;
export const OBS_MAX_LIMIT = 100;

/** Deepest page a caller may ask for. Bounds the OFFSET of every list query. */
export const OBS_MAX_PAGE = 10_000;

/** Most rows one users export may return. A larger match is flagged `truncated`. */
export const OBS_EXPORT_MAX_ROWS = 5000;

/** Rows in each detail block: models of a provider, and the other splits. */
export const OBS_DETAIL_MODELS_LIMIT = 100;
export const OBS_DETAIL_SPLIT_LIMIT = 50;

/** Providers listed on the refunded-holds card. */
export const OBS_HEALTH_PROVIDERS_LIMIT = 20;

/** Each filter option list is capped here; the caller gets the busiest first. */
export const OBS_FILTER_OPTIONS_LIMIT = 500;
export const OBS_PLAN_OPTIONS_LIMIT = 200;

/** Default window for the observability pages, in days. */
export const OBS_DEFAULT_DAYS = 7;

/**
 * The plan filter value (and plan group key) for rows with no plan at all.
 *
 * `weighted_usage_records.plan_id` is not filled by any writer today (the credit
 * path hardcodes null), so a row's plan is the ledger plan when it has one and
 * otherwise the user's plan AT QUERY TIME (`users.active_plan_id`). It is
 * therefore "the plan the user is on now", not "the plan at request time", for
 * rows that carry none. The key, the plan dimension, the filter and the search
 * all use this one expression so they always agree.
 */
export const OBS_NO_PLAN_KEY = 'NONE';
export const OBS_PLAN_ID_SQL = Prisma.sql`COALESCE(w.plan_id, u.active_plan_id)`;
export const OBS_PLAN_KEY_SQL = Prisma.sql`COALESCE(w.plan_id, u.active_plan_id, 'NONE')`;

/** A hold still RESERVED after this many minutes never settled or released. */
export const OBS_STALE_RESERVED_MINUTES = 15;
export const OBS_STALE_RESERVED_SQL = Prisma.raw(
  `now() - interval '${OBS_STALE_RESERVED_MINUTES} minutes'`,
);

/** Statement timeout for the heavy percentile and export queries, in milliseconds. */
export const OBS_STATEMENT_TIMEOUT_MS = 15_000;
/** Prisma's interactive-transaction limits: the statement timeout plus margin, so Prisma never cuts a query short first. */
export const OBS_TRANSACTION_TIMEOUT_MS = OBS_STATEMENT_TIMEOUT_MS + 5000;
export const OBS_TRANSACTION_MAX_WAIT_MS = 10_000;
export const OBS_STATEMENT_TIMEOUT_SQL = Prisma.raw(String(OBS_STATEMENT_TIMEOUT_MS));

/** Basis points per percent: shares and changes are computed in BigInt then divided once. */
export const OBS_BASIS_POINTS = 10_000n;

export const OBS_RATIO_DECIMALS = 4;
export const OBS_PERCENT_DECIMALS = 2;

export const OBS_HOURS_IN_DAY = 24;
export const OBS_DAYS_IN_WEEK = 7;

/**
 * `F`: the explorer FROM plus the plan joins. Both joins are on a primary key
 * so they can never multiply rows. `pl` is the row's plan (the ledger plan, else
 * the user's plan at query time, see `OBS_PLAN_ID_SQL`); `upl` is the user's plan today.
 */
export const OBS_FROM_SQL = Prisma.sql`${EXPLORER_FROM_SQL}
  LEFT JOIN plans pl ON pl.id = ${OBS_PLAN_ID_SQL}
  LEFT JOIN plans upl ON upl.id = u.active_plan_id`;

const BOTH_COSTS_SQL = Prisma.sql`(w.actual_cost_micro_usd > 0 AND w.estimated_cost_micro_usd > 0)`;

/** The explorer sums plus first seen, active days, absorbed allowance cost and estimate accuracy inputs. */
export const OBS_SUMS_SQL = Prisma.sql`${EXPLORER_SUMS_SQL},
  MIN(w.created_at) AS first_seen_at,
  COUNT(DISTINCT w.day_key)::int AS active_days,
  COALESCE(SUM(${ROW_COST_SQL}) FILTER (WHERE w.is_free_allowance), 0)::text AS allowance_cost_micro_usd,
  COALESCE(SUM(w.actual_cost_micro_usd) FILTER (WHERE ${BOTH_COSTS_SQL}), 0)::text AS accuracy_actual_micro_usd,
  COALESCE(SUM(w.estimated_cost_micro_usd) FILTER (WHERE ${BOTH_COSTS_SQL}), 0)::text AS accuracy_estimated_micro_usd`;

/**
 * A settled row with a meaningful reserve-to-settle time. Used ONLY by the settle-time
 * metrics (avg / p50 / p95). Legacy rows have `request_id = reservation_id` and a
 * `finalized_at` that is about `created_at` (written in one step, never reserved first),
 * which would drag every percentile to zero, so they are left out of the TIME. The
 * finalized / released counts and the settle / refund rates still read every row.
 */
export const OBS_SETTLED_SQL = Prisma.sql`w.state = 'FINALIZED' AND w.finalized_at IS NOT NULL AND w.finalized_at >= w.created_at AND w.request_id <> w.reservation_id`;

const NULL_USER = Prisma.sql`NULL::text AS email, NULL::text AS username, NULL::text AS role,
  NULL::text AS status, NULL::timestamp AS user_created_at`;
const NULL_PROVIDER = Prisma.sql`NULL::text AS raw_provider, NULL::text AS model`;
const NULL_PLAN = Prisma.sql`NULL::text AS plan_id, NULL::text AS plan_name`;

export const OBS_DIMENSION_SQL: Readonly<Record<ObservabilityEntity, ObservabilityDimensionSql>> = {
  [ObservabilityEntity.USER]: {
    key: Prisma.sql`w.user_id`,
    groupBy: Prisma.sql`w.user_id`,
    extras: Prisma.sql`MAX(u.email) AS email, MAX(u.username) AS username, MAX(u.role::text) AS role,
      MAX(u.status::text) AS status, MAX(u.created_at) AS user_created_at,
      ${NULL_PROVIDER}, MAX(u.active_plan_id) AS plan_id, MAX(upl.name) AS plan_name,
      1::int AS distinct_users, COUNT(DISTINCT w.model)::int AS distinct_models`,
  },
  [ObservabilityEntity.PROVIDER]: {
    key: Prisma.sql`k.provider_key`,
    groupBy: Prisma.sql`k.provider_key`,
    extras: Prisma.sql`${NULL_USER}, MIN(w.provider) AS raw_provider, NULL::text AS model,
      ${NULL_PLAN},
      COUNT(DISTINCT w.user_id)::int AS distinct_users, COUNT(DISTINCT w.model)::int AS distinct_models`,
  },
  [ObservabilityEntity.MODEL]: {
    key: Prisma.sql`k.provider_key || '/' || w.model`,
    groupBy: Prisma.sql`k.provider_key, w.model`,
    extras: Prisma.sql`${NULL_USER}, MIN(w.provider) AS raw_provider, w.model AS model,
      ${NULL_PLAN},
      COUNT(DISTINCT w.user_id)::int AS distinct_users, NULL::int AS distinct_models`,
  },
  [ObservabilityEntity.PLAN]: {
    key: OBS_PLAN_KEY_SQL,
    groupBy: OBS_PLAN_KEY_SQL,
    extras: Prisma.sql`${NULL_USER}, ${NULL_PROVIDER},
      MAX(${OBS_PLAN_ID_SQL}) AS plan_id, MAX(pl.name) AS plan_name,
      COUNT(DISTINCT w.user_id)::int AS distinct_users, NULL::int AS distinct_models`,
  },
  [ObservabilityEntity.WORKFLOW]: {
    key: Prisma.sql`k.workflow_key`,
    groupBy: Prisma.sql`k.workflow_key`,
    extras: Prisma.sql`${NULL_USER}, ${NULL_PROVIDER}, ${NULL_PLAN},
      COUNT(DISTINCT w.user_id)::int AS distinct_users, NULL::int AS distinct_models`,
  },
};

/** Sort expressions over a grouped query. All numeric so one comparison fits every sort. */
export const OBS_SORT_SQL: Readonly<Record<ObservabilitySortField, Prisma.Sql>> = {
  [ObservabilitySortField.REQUESTS]: Prisma.sql`COUNT(*)::numeric`,
  [ObservabilitySortField.TOKENS]: Prisma.sql`COALESCE(SUM(w.raw_input_tokens + w.raw_output_tokens), 0)::numeric`,
  [ObservabilitySortField.INPUT_TOKENS]: Prisma.sql`COALESCE(SUM(w.raw_input_tokens), 0)::numeric`,
  [ObservabilitySortField.OUTPUT_TOKENS]: Prisma.sql`COALESCE(SUM(w.raw_output_tokens), 0)::numeric`,
  [ObservabilitySortField.COST]: Prisma.sql`COALESCE(SUM(${ROW_COST_SQL}), 0)::numeric`,
  [ObservabilitySortField.COST_PER_REQUEST]: Prisma.sql`COALESCE(SUM(${ROW_COST_SQL}), 0)::numeric / NULLIF(COUNT(*), 0)`,
  [ObservabilitySortField.TOOL_CALLS]: Prisma.sql`COALESCE(SUM(w.tool_call_count), 0)::numeric`,
  [ObservabilitySortField.ACTIVE_DAYS]: Prisma.sql`COUNT(DISTINCT w.day_key)::numeric`,
  [ObservabilitySortField.LAST_SEEN]: Prisma.sql`(EXTRACT(EPOCH FROM MAX(w.created_at)) * 1000)::numeric`,
  [ObservabilitySortField.DISTINCT_USERS]: Prisma.sql`COUNT(DISTINCT w.user_id)::numeric`,
};

/** An aggregate with no rows behind it. */
export const EMPTY_OBS_SUMS_ROW: ObservabilitySumsRow = {
  requests: 0,
  input_tokens: 0n,
  output_tokens: 0n,
  cached_tokens: 0n,
  cache_write_tokens: 0n,
  reasoning_tokens: 0n,
  weighted_tokens: 0n,
  tool_calls: 0n,
  actual_micro_usd: '0',
  estimated_micro_usd: '0',
  priced_requests: 0,
  fallback_requests: 0,
  unmetered_requests: 0,
  unpriced_requests: 0,
  credit_requests: 0,
  allowance_requests: 0,
  credit_spend_micro_usd: '0',
  last_seen_at: null,
  first_seen_at: null,
  active_days: 0,
  allowance_cost_micro_usd: '0',
  accuracy_actual_micro_usd: '0',
  accuracy_estimated_micro_usd: '0',
};
