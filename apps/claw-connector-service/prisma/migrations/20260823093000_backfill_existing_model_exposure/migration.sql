-- One-time compatibility backfill for the model exposure migration.
-- The previous migration added the exposure column to connector_models with
-- DEFAULT 'UNEXPOSED', which means every row that already existed became unexposed.
-- The user-facing catalog now filters on exposure = 'EXPOSED', so deploying as-is
-- would silently remove every model from every user's picker in production.
-- This backfill grandfathers exactly the rows that were already reachable --
-- lifecycle ACTIVE on an enabled connector -- and nothing more.
-- A fresh install has no rows so this is a no-op.
-- Any model discovered after this point still arrives UNEXPOSED and needs a
-- deliberate admin decision before it becomes user-visible.

UPDATE "connector_models" cm
SET "exposure" = 'EXPOSED'
FROM "connectors" c
WHERE cm."connector_id" = c."id"
  AND cm."lifecycle" = 'ACTIVE'
  AND c."is_enabled" = true
  AND cm."exposure" = 'UNEXPOSED';