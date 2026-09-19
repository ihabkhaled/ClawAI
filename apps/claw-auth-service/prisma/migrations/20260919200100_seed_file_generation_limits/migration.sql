-- F3d (ADR-110): daily AI-written file allowance per plan, chosen by the owner
-- on 2026-09-19: Free 15, Starter 30, Plus 75, Pro 200 a day; Team, Scale and
-- Unlimited without a cap. Exports of an existing answer never count.
-- Existing rows are left alone, so an operator's later change survives.
INSERT INTO "plan_feature_rules" ("id", "plan_id", "feature", "access_mode", "limit", "window", "created_at", "updated_at")
SELECT
  'pfr_filegen_' || p."id",
  p."id",
  'FILE_GENERATION'::"PlanFeatureKey",
  CASE WHEN p."slug" IN ('team', 'scale', 'unlimited') THEN 'ENABLED'::"PlanFeatureAccessMode" ELSE 'LIMITED'::"PlanFeatureAccessMode" END,
  CASE p."slug"
    WHEN 'free' THEN 15
    WHEN 'starter' THEN 30
    WHEN 'plus' THEN 75
    WHEN 'pro' THEN 200
    WHEN 'team' THEN NULL
    WHEN 'scale' THEN NULL
    WHEN 'unlimited' THEN NULL
    ELSE 15
  END,
  'DAY'::"PlanFeatureWindow",
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
FROM "plans" p
ON CONFLICT ("plan_id", "feature") DO NOTHING;
