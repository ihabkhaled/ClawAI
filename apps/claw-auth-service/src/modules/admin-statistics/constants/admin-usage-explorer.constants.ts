import { Prisma } from '../../../generated/prisma';
import { type ExplorerSumsRow } from '../types/admin-usage-explorer.types';

/** Rows per page when the caller sends no `limit`. */
export const EXPLORER_DEFAULT_LIMIT = 25;
export const EXPLORER_MAX_LIMIT = 100;

/** Most rows one export may return. Larger sets must narrow the filters. */
export const EXPLORER_EXPORT_MAX_ROWS = 5000;
export const EXPLORER_EXPORT_PAGE_SIZE = 500;

/** Longest search text accepted. */
export const EXPLORER_SEARCH_MAX_LENGTH = 100;

/** Longest provider / model / workflow filter value accepted. */
export const EXPLORER_FILTER_MAX_LENGTH = 200;

/** Rows in each per-user breakdown table, and the cap of each filter option list. */
export const EXPLORER_BREAKDOWN_LIMIT = 50;
export const EXPLORER_FILTER_OPTIONS_LIMIT = 100;

/** Heaviest requests shown on the per-user view. */
export const EXPLORER_HEAVIEST_LIMIT = 10;

/** `days` preset ceiling: matches the 90-day range cap. */
export const EXPLORER_MAX_DAYS = 90;

/** Default window for every explorer endpoint, in days. */
export const EXPLORER_DEFAULT_DAYS = 7;

/** Routing keys for the admin read audit trail (consumed by audit-service). */
export const ADMIN_USAGE_VIEWED_EVENT = 'admin.usage.viewed';
export const ADMIN_USAGE_EXPORTED_EVENT = 'admin.usage.exported';

/** Escapes the three LIKE metacharacters so user text matches literally. */
export const LIKE_ESCAPE_PATTERN = /[\\%_]/g;

/** A sort value in a keyset cursor: a plain decimal, cast to numeric in SQL. */
export const CURSOR_NUMERIC_PATTERN = /^-?\d+(\.\d+)?$/;

/**
 * Normalised provider key: `local-ollama` and `LOCAL_OLLAMA` group together.
 * Written once; every explorer query reads `k.provider_key` / `k.workflow_key`.
 */
export const EXPLORER_FROM_SQL = Prisma.sql`
  weighted_usage_records w
  LEFT JOIN users u ON u.id = w.user_id
  CROSS JOIN LATERAL (
    SELECT UPPER(regexp_replace(w.provider, '[^A-Za-z0-9]+', '_', 'g')) AS provider_key,
           COALESCE(w.workflow, 'UNKNOWN') AS workflow_key
  ) k`;

const PRICED_SQL = Prisma.sql`(w.actual_cost_micro_usd > 0)`;
const FALLBACK_SQL = Prisma.sql`(w.actual_cost_micro_usd IS NULL AND w.estimated_cost_micro_usd > 0)`;
const UNMETERED_SQL = Prisma.sql`(NOT ${PRICED_SQL} AND NOT ${FALLBACK_SQL} AND u.role::text = 'ADMIN')`;

/** Per-row cost kind, one expression every query agrees on. */
export const ROW_COST_KIND_SQL = Prisma.sql`CASE
  WHEN ${PRICED_SQL} THEN 'PRICED'
  WHEN ${FALLBACK_SQL} THEN 'FALLBACK'
  WHEN ${UNMETERED_SQL} THEN 'UNMETERED'
  ELSE 'UNPRICED' END`;

/** Per-row billing kind. */
export const ROW_BILLING_KIND_SQL = Prisma.sql`CASE
  WHEN w.is_payg THEN 'CREDIT'
  WHEN w.is_free_allowance THEN 'ALLOWANCE'
  WHEN u.role::text = 'ADMIN' THEN 'UNMETERED'
  ELSE 'PLAN' END`;

/** Cost of one row: the settled figure when there is one, else the estimate. */
export const ROW_COST_SQL = Prisma.sql`COALESCE(w.actual_cost_micro_usd, w.estimated_cost_micro_usd)`;

/** Aggregate columns every grouped explorer query returns. */
export const EXPLORER_SUMS_SQL = Prisma.sql`
  COUNT(*)::int AS requests,
  COALESCE(SUM(w.raw_input_tokens), 0)::bigint AS input_tokens,
  COALESCE(SUM(w.raw_output_tokens), 0)::bigint AS output_tokens,
  COALESCE(SUM(w.raw_cached_tokens), 0)::bigint AS cached_tokens,
  COALESCE(SUM(w.raw_cache_write_tokens), 0)::bigint AS cache_write_tokens,
  COALESCE(SUM(w.raw_reasoning_tokens), 0)::bigint AS reasoning_tokens,
  COALESCE(SUM(w.weighted_tokens), 0)::bigint AS weighted_tokens,
  COALESCE(SUM(w.tool_call_count), 0)::bigint AS tool_calls,
  COALESCE(SUM(w.actual_cost_micro_usd), 0)::text AS actual_micro_usd,
  COALESCE(SUM(CASE WHEN w.actual_cost_micro_usd IS NULL THEN w.estimated_cost_micro_usd END), 0)::text AS estimated_micro_usd,
  COUNT(*) FILTER (WHERE ${PRICED_SQL})::int AS priced_requests,
  COUNT(*) FILTER (WHERE ${FALLBACK_SQL})::int AS fallback_requests,
  COUNT(*) FILTER (WHERE ${UNMETERED_SQL})::int AS unmetered_requests,
  COUNT(*) FILTER (WHERE NOT ${PRICED_SQL} AND NOT ${FALLBACK_SQL} AND NOT ${UNMETERED_SQL})::int AS unpriced_requests,
  COUNT(*) FILTER (WHERE w.is_payg)::int AS credit_requests,
  COUNT(*) FILTER (WHERE w.is_free_allowance)::int AS allowance_requests,
  COALESCE(SUM(w.credit_grant_micro_usd + w.credit_purchased_micro_usd), 0)::text AS credit_spend_micro_usd,
  MAX(w.created_at) AS last_seen_at`;

/** SQL pieces that differ per leaderboard dimension. Static fragments: no caller text is ever interpolated. */
export type ExplorerDimensionSql = {
  key: Prisma.Sql;
  groupBy: Prisma.Sql;
  extras: Prisma.Sql;
};

const NO_USER_COLUMNS = Prisma.sql`NULL::text AS email, NULL::text AS username, NULL::text AS role`;

export const EXPLORER_DIMENSION_SQL: Readonly<Record<string, ExplorerDimensionSql>> = {
  provider: {
    key: Prisma.sql`k.provider_key`,
    groupBy: Prisma.sql`k.provider_key`,
    extras: Prisma.sql`${NO_USER_COLUMNS}, MIN(w.provider) AS raw_provider, NULL::text AS model`,
  },
  model: {
    key: Prisma.sql`k.provider_key || '/' || w.model`,
    groupBy: Prisma.sql`k.provider_key, w.model`,
    extras: Prisma.sql`${NO_USER_COLUMNS}, MIN(w.provider) AS raw_provider, w.model AS model`,
  },
  workflow: {
    key: Prisma.sql`k.workflow_key`,
    groupBy: Prisma.sql`k.workflow_key`,
    extras: Prisma.sql`${NO_USER_COLUMNS}, NULL::text AS raw_provider, NULL::text AS model`,
  },
  user: {
    key: Prisma.sql`w.user_id`,
    groupBy: Prisma.sql`w.user_id`,
    extras: Prisma.sql`MAX(u.email) AS email, MAX(u.username) AS username, MAX(u.role::text) AS role, NULL::text AS raw_provider, NULL::text AS model`,
  },
};

/** Sort expressions over a grouped query. All numeric so one keyset comparison fits every sort. */
export const EXPLORER_GROUP_SORT_SQL: Readonly<Record<string, Prisma.Sql>> = {
  requests: Prisma.sql`COUNT(*)::numeric`,
  tokens: Prisma.sql`COALESCE(SUM(w.raw_input_tokens + w.raw_output_tokens), 0)::numeric`,
  cost: Prisma.sql`COALESCE(SUM(${ROW_COST_SQL}), 0)::numeric`,
  lastSeen: Prisma.sql`(EXTRACT(EPOCH FROM MAX(w.created_at)) * 1000)::numeric`,
};

/** Sort expressions over single ledger rows. */
export const EXPLORER_ROW_SORT_SQL: Readonly<Record<string, Prisma.Sql>> = {
  time: Prisma.sql`(EXTRACT(EPOCH FROM w.created_at) * 1000)::numeric`,
  tokens: Prisma.sql`(w.raw_input_tokens + w.raw_output_tokens)::numeric`,
  cost: Prisma.sql`COALESCE(${ROW_COST_SQL}, 0)::numeric`,
};

/** An aggregate with no rows behind it. */
export const EMPTY_EXPLORER_SUMS_ROW: ExplorerSumsRow = {
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
};
