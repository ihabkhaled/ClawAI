import { Prisma } from '../../../generated/prisma';

/** Hard ceiling on a requested range, in days. A wider window is rejected, never clamped. */
export const ADMIN_USAGE_MAX_RANGE_DAYS = 90;

/** Ranges up to this many days are bucketed hourly; wider ranges are bucketed daily. */
export const ADMIN_USAGE_HOURLY_MAX_DAYS = 7;

/** Largest `hours` preset: exactly the hourly ceiling. */
export const ADMIN_USAGE_MAX_HOURS = ADMIN_USAGE_HOURLY_MAX_DAYS * 24;

/** Rows per ranked list (models, users, tools) when the caller sends no `limit`. */
export const ADMIN_USAGE_DEFAULT_LIMIT = 10;

/** Most rows a ranked list may ask for. Bounds every GROUP BY result. */
export const ADMIN_USAGE_MAX_LIMIT = 50;

/** Rows in the per-user model table; the modal shows every model a user used, bounded. */
export const ADMIN_USAGE_USER_MODELS_LIMIT = 50;

/** Default per-user breakdown window: this many days back from now. */
export const ADMIN_USAGE_USER_DEFAULT_DAYS = 30;

/** Look-back when the admin-wide view is opened with no range at all. */
export const ADMIN_USAGE_OVERVIEW_DEFAULT_DAYS = 1;

/**
 * Aggregate columns shared by every grouped usage query. Cost is the settled
 * figure when there is one, else the reservation estimate: one expression so
 * every query agrees on what "cost" means.
 */
export const USAGE_SUMS_SQL = Prisma.sql`
  COUNT(*)::int AS requests,
  COALESCE(SUM(raw_input_tokens), 0)::bigint AS input_tokens,
  COALESCE(SUM(raw_output_tokens), 0)::bigint AS output_tokens,
  COALESCE(SUM(weighted_tokens), 0)::bigint AS weighted_tokens,
  COALESCE(SUM(COALESCE(actual_cost_micro_usd, estimated_cost_micro_usd)), 0)::text AS cost_micro_usd,
  COALESCE(SUM(tool_call_count), 0)::bigint AS tool_calls`;

/** Label for a ledger row written before `workflow` was recorded. */
export const ADMIN_USAGE_UNKNOWN_WORKFLOW = 'UNKNOWN';

export const MS_PER_HOUR = 3_600_000;
export const MS_PER_DAY = 86_400_000;
