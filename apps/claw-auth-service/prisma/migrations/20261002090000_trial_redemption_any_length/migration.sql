-- ADR-140 follow-up (production incident 2026-10-01): the redemption row kept the
-- original rule "expires_at = started_at + 30 days" from 20260809120000. Once the
-- owner set the Free trial to 90 days, every signup trial and every admin
-- "Set to Free for N days" / "Add trial days" violated it and answered HTTP 500.
-- The length now lives on the plan (1..3650 days) and admins may extend a trial,
-- so the only invariant left is that a trial ends after it starts.
ALTER TABLE "plan_trial_redemptions" DROP CONSTRAINT IF EXISTS "plan_trial_redemptions_duration_check";
ALTER TABLE "plan_trial_redemptions" ADD CONSTRAINT "plan_trial_redemptions_duration_check" CHECK ("expires_at" > "started_at");
