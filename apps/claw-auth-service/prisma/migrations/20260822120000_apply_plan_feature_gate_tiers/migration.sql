-- Product policy: the sixteen orchestration features belong to the paid tiers.
--
-- 20260820180000_apply_approved_free_plan_limits switched most of them on for
-- `free`, which left the public pricing page showing the free tier holding the
-- entire feature set — and carrying the "most popular" badge. This restores the
-- intended split and moves the badge to `pro`.
--
--   pro, team, scale, unlimited : all sixteen enabled
--   trial, free, starter, plus  : all sixteen disabled
--   most popular                : pro
--
-- Slugs that do not exist in a given installation simply match no rows, so this
-- is safe to run anywhere and idempotent on re-run.

UPDATE "plans"
SET
  "allow_compare_mode" = true,
  "allow_judge_mode" = true,
  "allow_research_mode" = true,
  "allow_critic_review" = true,
  "allow_workspaces" = true,
  "allow_memory" = true,
  "allow_context_packs" = true,
  "allow_consensus_mode" = true,
  "allow_escalation_chain" = true,
  "allow_repair_lab" = true,
  "allow_task_decomposer" = true,
  "allow_best_of_n" = true,
  "allow_verifier" = true,
  "allow_pipeline_lab" = true,
  "allow_cost_ensemble" = true,
  "allow_role_pack" = true
WHERE "slug" IN ('pro', 'team', 'scale', 'unlimited');

UPDATE "plans"
SET
  "allow_compare_mode" = false,
  "allow_judge_mode" = false,
  "allow_research_mode" = false,
  "allow_critic_review" = false,
  "allow_workspaces" = false,
  "allow_memory" = false,
  "allow_context_packs" = false,
  "allow_consensus_mode" = false,
  "allow_escalation_chain" = false,
  "allow_repair_lab" = false,
  "allow_task_decomposer" = false,
  "allow_best_of_n" = false,
  "allow_verifier" = false,
  "allow_pipeline_lab" = false,
  "allow_cost_ensemble" = false,
  "allow_role_pack" = false
WHERE "slug" IN ('trial', 'free', 'starter', 'plus');

-- Exactly one plan carries the badge, so this both sets `pro` and clears
-- whichever plan held it before.
UPDATE "plans" SET "is_default" = ("slug" = 'pro');

-- Entitlements read the plans table, but plan_feature_rules drives the admin
-- plan editor. Align the seven features the two representations share so the
-- editor cannot contradict the gate. WEB_SEARCH, WEB_FETCH and WEB_EXTRACT are
-- not part of this policy and keep whatever they were set to.
UPDATE "plan_feature_rules"
SET "access_mode" = 'ENABLED', "limit" = NULL, "updated_at" = CURRENT_TIMESTAMP
WHERE "feature" IN (
    'COMPARE_MODE',
    'JUDGE_MODE',
    'RESEARCH_MODE',
    'CRITIC_REVIEW',
    'WORKSPACES',
    'MEMORY',
    'CONTEXT_PACKS'
  )
  AND "plan_id" IN (
    SELECT "id" FROM "plans" WHERE "slug" IN ('pro', 'team', 'scale', 'unlimited')
  );

UPDATE "plan_feature_rules"
SET "access_mode" = 'DISABLED', "limit" = NULL, "updated_at" = CURRENT_TIMESTAMP
WHERE "feature" IN (
    'COMPARE_MODE',
    'JUDGE_MODE',
    'RESEARCH_MODE',
    'CRITIC_REVIEW',
    'WORKSPACES',
    'MEMORY',
    'CONTEXT_PACKS'
  )
  AND "plan_id" IN (
    SELECT "id" FROM "plans" WHERE "slug" IN ('trial', 'free', 'starter', 'plus')
  );
