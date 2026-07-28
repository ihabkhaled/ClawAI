ALTER TABLE "plans"
ALTER COLUMN "model_access_mode" SET DEFAULT 'ALLOW_ALL';

UPDATE "plans" AS "plan"
SET
  "model_access_mode" = 'ALLOW_ALL',
  "allowed_cost_classes" = ARRAY[]::TEXT[]
WHERE
  "plan"."model_access_mode" IN ('LEGACY_UNRESTRICTED', 'ALLOW_COST_CLASSES')
  AND NOT EXISTS (
    SELECT 1
    FROM "plan_model_access" AS "access"
    WHERE "access"."plan_id" = "plan"."id"
  );
