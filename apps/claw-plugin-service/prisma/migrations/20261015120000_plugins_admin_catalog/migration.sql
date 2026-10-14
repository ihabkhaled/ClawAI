-- Additive and idempotent: admin curation of the catalog, host rules, audit, server decisions.

DO $$ BEGIN
  CREATE TYPE "CatalogHealthStatus" AS ENUM ('UNKNOWN', 'OK', 'DOWN');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "HostRuleKind" AS ENUM ('ALLOW', 'DENY');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "HostRuleMatch" AS ENUM ('HOST', 'PUBLISHER', 'SLUG');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE "plugin_catalog_entries"
  ADD COLUMN IF NOT EXISTS "deleted_at" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "admin_notes" TEXT,
  ADD COLUMN IF NOT EXISTS "needs_verification" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "allowed_plan_slugs" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  ADD COLUMN IF NOT EXISTS "health_status" "CatalogHealthStatus" NOT NULL DEFAULT 'UNKNOWN',
  ADD COLUMN IF NOT EXISTS "health_latency_ms" INTEGER,
  ADD COLUMN IF NOT EXISTS "health_checked_at" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "health_error_code" TEXT;

ALTER TABLE "mcp_servers"
  ADD COLUMN IF NOT EXISTS "decided_by" TEXT,
  ADD COLUMN IF NOT EXISTS "decided_at" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "decision_reason" TEXT;

CREATE INDEX IF NOT EXISTS "mcp_servers_status_created_at_idx" ON "mcp_servers"("status", "created_at");

CREATE TABLE IF NOT EXISTS "plugin_host_rules" (
    "id" TEXT NOT NULL,
    "kind" "HostRuleKind" NOT NULL,
    "match" "HostRuleMatch" NOT NULL,
    "pattern" TEXT NOT NULL,
    "note" TEXT,
    "created_by" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "plugin_host_rules_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "plugin_host_rules_kind_match_pattern_key" ON "plugin_host_rules"("kind", "match", "pattern");

CREATE TABLE IF NOT EXISTS "plugin_admin_audit" (
    "id" TEXT NOT NULL,
    "actor_id" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "target_type" TEXT NOT NULL,
    "target_id" TEXT NOT NULL,
    "summary" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "plugin_admin_audit_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "plugin_admin_audit_created_at_idx" ON "plugin_admin_audit"("created_at");
CREATE INDEX IF NOT EXISTS "plugin_admin_audit_target_type_target_id_idx" ON "plugin_admin_audit"("target_type", "target_id");
