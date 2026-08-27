/**
 * The sentinel `Plan.popularKey` carries while a plan holds the "Most popular"
 * badge.
 *
 * The value itself is arbitrary — what matters is that it is the same literal on
 * every badged row, so the unique index rejects a second one, and NULL
 * everywhere else, so any number of plans can be un-badged. Follows
 * `PlanPriceVersion.activeKey`, which emulates a partial unique index the same
 * way because Prisma cannot express one.
 */
export const POPULAR_PLAN_KEY = 'popular';
