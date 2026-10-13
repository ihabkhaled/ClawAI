-- Plugins and MCP: the daily plugin-call allowance per plan.
--
-- max_plugin_calls_per_day is nullable: NULL = unlimited, 0 = disabled, never interchangeable.
-- Its column default is the FREE value (20) so a row created without it can never land on
-- NULL/unlimited. Per tier: Starter 100, Plus 300, Pro 1000, Team/Scale 5000, Unlimited NULL.
-- Each UPDATE only touches a row still holding the column default, so it cannot overwrite a
-- number an administrator tuned to anything else. Run once by `prisma migrate deploy`; do not
-- run it by hand on a live system (it cannot tell an untouched default from an administrator
-- who chose exactly 20).
--
-- Then every plan, custom ones included, gets a PLUGIN_CALLS rule derived from the column so
-- no plan reads as disabled (an absent rule fails CLOSED). ON CONFLICT DO NOTHING keeps any
-- rule that already exists, so a re-run never re-enables or rewrites an administrator's value.
ALTER TABLE "plans" ADD COLUMN IF NOT EXISTS "max_plugin_calls_per_day" INTEGER DEFAULT 20;

UPDATE "plans" SET "max_plugin_calls_per_day" = 100 WHERE "slug" = 'starter' AND "max_plugin_calls_per_day" = 20;
UPDATE "plans" SET "max_plugin_calls_per_day" = 300 WHERE "slug" = 'plus' AND "max_plugin_calls_per_day" = 20;
UPDATE "plans" SET "max_plugin_calls_per_day" = 1000 WHERE "slug" = 'pro' AND "max_plugin_calls_per_day" = 20;
UPDATE "plans" SET "max_plugin_calls_per_day" = 5000 WHERE "slug" IN ('team', 'scale') AND "max_plugin_calls_per_day" = 20;
UPDATE "plans" SET "max_plugin_calls_per_day" = NULL WHERE "slug" = 'unlimited' AND "max_plugin_calls_per_day" = 20;

INSERT INTO "plan_feature_rules" ("id", "plan_id", "feature", "access_mode", "limit", "window", "created_at", "updated_at")
SELECT
  'pfr_plugincalls_' || p."id",
  p."id",
  'PLUGIN_CALLS'::"PlanFeatureKey",
  CASE
    WHEN p."max_plugin_calls_per_day" IS NULL THEN 'ENABLED'::"PlanFeatureAccessMode"
    WHEN p."max_plugin_calls_per_day" = 0 THEN 'DISABLED'::"PlanFeatureAccessMode"
    ELSE 'LIMITED'::"PlanFeatureAccessMode"
  END,
  CASE WHEN p."max_plugin_calls_per_day" > 0 THEN p."max_plugin_calls_per_day" ELSE NULL END,
  'DAY'::"PlanFeatureWindow",
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
FROM "plans" p
ON CONFLICT ("plan_id", "feature") DO NOTHING;
