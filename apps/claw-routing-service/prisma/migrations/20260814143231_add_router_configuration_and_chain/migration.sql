-- CreateEnum
CREATE TYPE "RouterConfigurationMode" AS ENUM ('CLOUD_FIRST', 'HYBRID', 'PRIVATE_CLOUD', 'LOCAL_ONLY');

-- CreateEnum
CREATE TYPE "RouterConfigurationStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'SUPERSEDED');

-- CreateEnum
CREATE TYPE "RouterChainEntryRole" AS ENUM ('PRIMARY', 'MODEL_FALLBACK', 'PROVIDER_FALLBACK', 'PROVIDER_MODEL_FALLBACK', 'LAST_RESORT', 'QUALITY_ESCALATION');

-- CreateEnum
CREATE TYPE "LowConfidenceAction" AS ENUM ('QUALITY_ESCALATION_THEN_DETERMINISTIC', 'DETERMINISTIC_ONLY', 'FAIL_CLOSED');

-- CreateTable
CREATE TABLE "router_configurations" (
    "id" TEXT NOT NULL,
    "scope" TEXT NOT NULL DEFAULT 'GLOBAL',
    "revision" INTEGER NOT NULL,
    "status" "RouterConfigurationStatus" NOT NULL DEFAULT 'DRAFT',
    "mode" "RouterConfigurationMode" NOT NULL DEFAULT 'CLOUD_FIRST',
    "enabled" BOOLEAN NOT NULL DEFAULT false,
    "total_deadline_ms" INTEGER NOT NULL DEFAULT 5000,
    "max_attempts" INTEGER NOT NULL DEFAULT 6,
    "max_router_input_tokens" INTEGER NOT NULL DEFAULT 1800,
    "max_router_output_tokens" INTEGER NOT NULL DEFAULT 320,
    "min_confidence" DECIMAL(4,3) NOT NULL DEFAULT 0.75,
    "low_confidence_action" "LowConfidenceAction" NOT NULL DEFAULT 'QUALITY_ESCALATION_THEN_DETERMINISTIC',
    "fail_closed_when_no_eligible_router" BOOLEAN NOT NULL DEFAULT true,
    "skip_provider_on_provider_wide_failure" BOOLEAN NOT NULL DEFAULT true,
    "safe_trace_level" TEXT NOT NULL DEFAULT 'DETAILED_FACTORS',
    "legacy_local_rollback_enabled" BOOLEAN NOT NULL DEFAULT true,
    "supersedes_revision" INTEGER,
    "published_at" TIMESTAMP(3),
    "published_by" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "router_configurations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "router_chain_entries" (
    "id" TEXT NOT NULL,
    "configuration_id" TEXT NOT NULL,
    "order" INTEGER NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "role" "RouterChainEntryRole" NOT NULL DEFAULT 'PROVIDER_FALLBACK',
    "deployment_id" TEXT,
    "model_alias" TEXT NOT NULL,
    "provider" "RouterProvider" NOT NULL,
    "attempt_timeout_ms" INTEGER NOT NULL DEFAULT 1600,
    "retries" INTEGER NOT NULL DEFAULT 0,
    "triggers" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "skip_when_provider_circuit_open" BOOLEAN NOT NULL DEFAULT true,
    "min_confidence" DECIMAL(4,3),
    "max_cost_micro_usd" BIGINT,
    "billing_model" "BillingModel" NOT NULL DEFAULT 'UNKNOWN',
    "last_validated_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "router_chain_entries_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "router_configurations_scope_status_idx" ON "router_configurations"("scope", "status");

-- CreateIndex
CREATE UNIQUE INDEX "router_configurations_scope_revision_key" ON "router_configurations"("scope", "revision");

-- CreateIndex
CREATE INDEX "router_chain_entries_configuration_id_enabled_idx" ON "router_chain_entries"("configuration_id", "enabled");

-- CreateIndex
CREATE INDEX "router_chain_entries_provider_idx" ON "router_chain_entries"("provider");

-- CreateIndex
CREATE UNIQUE INDEX "router_chain_entries_configuration_id_order_key" ON "router_chain_entries"("configuration_id", "order");

-- AddForeignKey
ALTER TABLE "router_chain_entries" ADD CONSTRAINT "router_chain_entries_configuration_id_fkey" FOREIGN KEY ("configuration_id") REFERENCES "router_configurations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- At most one PUBLISHED revision per scope.
--
-- Prisma cannot express a partial unique index, and this one is load-bearing:
-- two rows claiming to be the live configuration would make "which chain is
-- running" ambiguous, and a publish that raced another would silently win
-- instead of conflicting. DRAFT and SUPERSEDED rows are unconstrained, so
-- history and work-in-progress accumulate freely.
CREATE UNIQUE INDEX "router_configurations_one_published_per_scope"
  ON "router_configurations" ("scope")
  WHERE "status" = 'PUBLISHED';
