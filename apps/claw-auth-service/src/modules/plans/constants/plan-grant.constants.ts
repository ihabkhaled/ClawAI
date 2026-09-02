/** Refusal code for a missing/invalid admin-grant duration. */
export const PLAN_GRANT_DURATION_INVALID = 'PLAN_GRANT_DURATION_INVALID';
/** Refusal code for a missing/empty admin-grant reason. */
export const PLAN_GRANT_REASON_REQUIRED = 'PLAN_GRANT_REASON_REQUIRED';
/** Ceiling on an admin grant's duration — a deliberate cap against a typo like
 * 240 silently granting two decades, not a real expected value. */
export const PLAN_GRANT_MAX_DURATION_MONTHS = 60;
