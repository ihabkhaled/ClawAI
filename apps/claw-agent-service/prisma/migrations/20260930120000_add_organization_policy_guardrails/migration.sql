-- F053 / F054: organization deny rules, trust lists and MCP server patterns.
-- Defaults are the widest possible value (no rules, no lists, no patterns), for
-- the same reason as the original table: a migration that tightened on arrival
-- would lock out every member of every organization the moment it ran.
ALTER TABLE "organization_policies"
    ADD COLUMN "rules" JSONB NOT NULL DEFAULT '[]',
    ADD COLUMN "trust" JSONB NOT NULL DEFAULT '{"repositories":[],"domains":[],"commands":[]}',
    ADD COLUMN "mcpServers" JSONB NOT NULL DEFAULT '{"allow":[],"deny":[]}';
