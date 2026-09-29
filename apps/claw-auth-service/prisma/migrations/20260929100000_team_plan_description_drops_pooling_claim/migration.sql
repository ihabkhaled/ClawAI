-- The Team plan's seeded description promised "shared workspaces and a large
-- pooled allowance". Pooled billing across members is not built (REQ-POS-005),
-- so the text overclaimed. Text only: no price, quota or entitlement changes.
--
-- Guarded on the exact old text so an operator who already edited the
-- description in the admin console keeps their wording.
UPDATE "plans"
SET "description" = 'A large monthly allowance for heavy daily use.'
WHERE "slug" = 'team'
  AND "description" = 'Shared workspaces and a large pooled allowance.';
