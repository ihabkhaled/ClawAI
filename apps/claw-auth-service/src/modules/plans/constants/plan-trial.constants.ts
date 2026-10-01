/** Smallest trial length an administrator can configure or grant, in days. */
export const PLAN_TRIAL_MIN_DAYS = 1;
/** Ten years. A ceiling against a typo (36500), not an expected value. */
export const PLAN_TRIAL_MAX_DAYS = 3650;
/** Length a fresh database seeds the free plan with. Editable per plan afterwards. */
export const PLAN_TRIAL_DEFAULT_DAYS = 30;
/**
 * Milliseconds in a day. A trial is a fixed duration from its grant instant, so
 * it is measured in absolute elapsed time rather than calendar days.
 */
export const PLAN_TRIAL_MS_PER_DAY = 86_400_000;

/** Refusal code for a trial length outside the allowed range. */
export const PLAN_TRIAL_DURATION_INVALID = 'PLAN_TRIAL_DURATION_INVALID';
/** Refusal code for adding trial days to a user who has never had a trial. */
export const PLAN_TRIAL_NOT_FOUND = 'PLAN_TRIAL_NOT_FOUND';
/** Refusal code for adding trial days when another grant replaced the trial. */
export const PLAN_TRIAL_SUPERSEDED = 'PLAN_TRIAL_SUPERSEDED';
/** Refusal code for a trial plan that has no length configured. */
export const PLAN_TRIAL_LENGTH_MISSING = 'PLAN_TRIAL_LENGTH_MISSING';
