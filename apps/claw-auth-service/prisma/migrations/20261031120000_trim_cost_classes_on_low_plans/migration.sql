-- Keep the dearest models off the low plans: Starter stops at STANDARD (output under $6 per
-- million tokens), Plus stops at PREMIUM (under $40). Pro, Team, Scale and Unlimited keep all five.
--
-- Only a plan still on the shipped all-five list is moved. A plan an administrator already edited
-- (any other list, or explicit per-model rows) is left exactly as it is, and re-running is a no-op.
UPDATE "plans"
SET "allowed_cost_classes" = ARRAY['FREE', 'CHEAP', 'STANDARD']::TEXT[]
WHERE "slug" = 'starter'
  AND "model_access_mode" = 'ALLOW_COST_CLASSES'
  AND "allowed_cost_classes" = ARRAY['FREE', 'CHEAP', 'STANDARD', 'PREMIUM', 'ULTRA']::TEXT[];

UPDATE "plans"
SET "allowed_cost_classes" = ARRAY['FREE', 'CHEAP', 'STANDARD', 'PREMIUM']::TEXT[]
WHERE "slug" = 'plus'
  AND "model_access_mode" = 'ALLOW_COST_CLASSES'
  AND "allowed_cost_classes" = ARRAY['FREE', 'CHEAP', 'STANDARD', 'PREMIUM', 'ULTRA']::TEXT[];
