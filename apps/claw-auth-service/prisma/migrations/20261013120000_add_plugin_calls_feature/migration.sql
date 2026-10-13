-- Plugins and MCP (docs/implementation/plugins-and-mcp-design.md section 5): plugin tool
-- calls become a metered plan feature, reserved by claw-plugin-service per invoke.
-- The value is added in its own migration: Postgres cannot use a new enum value inside the
-- transaction that added it.
ALTER TYPE "PlanFeatureKey" ADD VALUE IF NOT EXISTS 'PLUGIN_CALLS';
