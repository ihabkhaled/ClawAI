-- F081: organization plugin marketplace allowlist. Nullable on purpose: NULL means
-- the organization has no opinion, so this migration constrains no existing member.
ALTER TABLE "organization_policies" ADD COLUMN "allowedPluginMarketplaces" JSONB;
