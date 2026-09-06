/**
 * How many calendar months of credit consumption the admin panel reports,
 * counting the current (partial) month as one of them.
 *
 * Twelve because the question an operator asks in front of this panel is "is
 * this account's spend normal for it", which needs a year to answer, and
 * because the query is a single indexed GROUP BY whose cost scales with rows
 * matched rather than months requested. It is a ceiling, not a promise: months
 * with no settled spend are absent from the result entirely.
 */
export const ADMIN_CREDIT_CONSUMPTION_MONTHS = 12;
