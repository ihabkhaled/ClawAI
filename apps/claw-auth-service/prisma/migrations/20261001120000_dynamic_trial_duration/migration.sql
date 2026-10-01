-- ADR-140: the free-trial length is a per-plan setting, not the constant 30.
-- Any whole number of days from 1 to 3650 is valid on a trial plan; a plan that
-- is not a trial still carries none. Existing rows (30 on the free plan) already
-- satisfy the wider rule, so no data is rewritten.
ALTER TABLE "plans" DROP CONSTRAINT IF EXISTS "plans_trial_duration_check";
ALTER TABLE "plans" ADD CONSTRAINT "plans_trial_duration_check" CHECK (
  ("is_trial" AND "trial_duration_days" BETWEEN 1 AND 3650)
  OR (NOT "is_trial" AND "trial_duration_days" IS NULL)
);
