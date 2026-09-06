/**
 * Milliseconds in a day, for trial-remaining arithmetic.
 *
 * A trial is a fixed duration from its grant instant (`assignTrialPlanOnce`
 * writes `now + 30 * 24 * 60 * 60 * 1000`), so it is measured in absolute
 * elapsed time, not calendar days. That makes a flat constant correct here —
 * and makes calendar walking wrong, since it would drift the answer across a
 * DST boundary for a duration that never observed one.
 */
export const MILLISECONDS_PER_DAY = 86_400_000;
