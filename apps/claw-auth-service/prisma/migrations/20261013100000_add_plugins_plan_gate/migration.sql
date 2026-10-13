-- Plugins and MCP (docs/implementation/plugins-and-mcp-design.md section 5).
--
-- Owner decision (2026-10-13): the plugins module is ON for every plan,
-- including Free. So the gate is DEFAULT true (every other gate is opt-in
-- DEFAULT false) and a custom plan an administrator creates later gets it too.
--
-- The two caps are nullable: NULL = unlimited, 0 = disabled, never
-- interchangeable. Their column defaults are the FREE values (5 installs, 0 own
-- MCP servers) so a row created without them can never land on NULL/unlimited.
--
-- The gate is never re-written after the column exists: the column default turns it
-- on for existing rows once, and a re-run must not re-enable a plan an administrator
-- switched off.
--
-- Run once by `prisma migrate deploy`. ADD COLUMN IF NOT EXISTS is safe to repeat; each cap
-- UPDATE only touches a row still holding the column default, so it cannot overwrite a
-- number an administrator tuned to anything else. (It cannot tell an untouched default from
-- an administrator who chose exactly that default, so do not run it by hand on a live system.)
ALTER TABLE "plans" ADD COLUMN IF NOT EXISTS "allow_plugins" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "plans" ADD COLUMN IF NOT EXISTS "max_installed_plugins" INTEGER DEFAULT 5;
ALTER TABLE "plans" ADD COLUMN IF NOT EXISTS "max_user_mcp_servers" INTEGER DEFAULT 0;

-- Installs per tier. Free and the legacy trial row keep the default (5).
UPDATE "plans" SET "max_installed_plugins" = 10 WHERE "slug" = 'starter' AND "max_installed_plugins" = 5;
UPDATE "plans" SET "max_installed_plugins" = 25 WHERE "slug" = 'plus' AND "max_installed_plugins" = 5;
UPDATE "plans" SET "max_installed_plugins" = 50 WHERE "slug" = 'pro' AND "max_installed_plugins" = 5;
UPDATE "plans" SET "max_installed_plugins" = 100 WHERE "slug" IN ('team', 'scale') AND "max_installed_plugins" = 5;
UPDATE "plans" SET "max_installed_plugins" = NULL WHERE "slug" = 'unlimited' AND "max_installed_plugins" = 5;

-- Own MCP servers per tier. Free and trial keep the default (0: catalog only).
UPDATE "plans" SET "max_user_mcp_servers" = 3 WHERE "slug" = 'starter' AND "max_user_mcp_servers" = 0;
UPDATE "plans" SET "max_user_mcp_servers" = 5 WHERE "slug" = 'plus' AND "max_user_mcp_servers" = 0;
UPDATE "plans" SET "max_user_mcp_servers" = 10 WHERE "slug" = 'pro' AND "max_user_mcp_servers" = 0;
UPDATE "plans" SET "max_user_mcp_servers" = 25 WHERE "slug" IN ('team', 'scale') AND "max_user_mcp_servers" = 0;
UPDATE "plans" SET "max_user_mcp_servers" = NULL WHERE "slug" = 'unlimited' AND "max_user_mcp_servers" = 0;
