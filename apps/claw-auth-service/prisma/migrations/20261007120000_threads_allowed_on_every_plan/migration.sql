-- Threads generation reserves RESEARCH_MODE, JUDGE_MODE and CRITIC_REVIEW from
-- plan_feature_rules (thread-job-budget.service). Free, Starter and Plus had
-- those rules DISABLED, so they could not create a Thread at all. Owner decision
-- 2026-10-07: Threads is open to every plan and to admins.
--
-- This only touches plan_feature_rules. Chat's Research, Judge and Critic gates
-- read the plans.allow_* columns, which stay as they are.
--
-- Values are the plan catalog's (plan-catalog.json). Only a rule still DISABLED
-- is changed, so a limit an administrator already set is never overwritten.
UPDATE "plan_feature_rules" AS rule
SET "access_mode" = 'LIMITED',
    "limit" = CASE
      WHEN plan."slug" = 'free' THEN 1
      WHEN plan."slug" = 'starter' AND rule."feature" = 'CRITIC_REVIEW' THEN 1
      WHEN plan."slug" = 'starter' THEN 2
      WHEN plan."slug" = 'plus' AND rule."feature" = 'CRITIC_REVIEW' THEN 5
      ELSE 10
    END,
    "window" = CASE WHEN plan."slug" = 'free' THEN 'LIFETIME'::"PlanFeatureWindow" ELSE 'MONTH'::"PlanFeatureWindow" END,
    "updated_at" = CURRENT_TIMESTAMP
FROM "plans" AS plan
WHERE rule."plan_id" = plan."id"
  AND plan."slug" IN ('free', 'starter', 'plus')
  AND rule."feature" IN ('RESEARCH_MODE', 'JUDGE_MODE', 'CRITIC_REVIEW')
  AND rule."access_mode" = 'DISABLED';
