-- Anthropic identity-linked API keys reject every request that does not name the
-- workspace it acts in (`anthropic-workspace-id`). Nullable: only some providers
-- and some key types need it, and an existing connector must keep working.
ALTER TABLE "connectors" ADD COLUMN "workspace_id" TEXT;
