-- CreateEnum
CREATE TYPE "ModelCostSource" AS ENUM ('SEED', 'PROVIDER_SYNC', 'ADMIN_OVERRIDE', 'PROVIDER_REPORTED');

-- CreateEnum
CREATE TYPE "LocalComputeOwnership" AS ENUM ('USER_OWNED', 'PLATFORM_HOSTED');

-- CreateTable
CREATE TABLE "model_cost_versions" (
    "id" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "model_key" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "input_per_million_micro_usd" BIGINT,
    "output_per_million_micro_usd" BIGINT,
    "cached_input_per_million_micro_usd" BIGINT,
    "cache_write_per_million_micro_usd" BIGINT,
    "reasoning_per_million_micro_usd" BIGINT,
    "image_per_unit_micro_usd" BIGINT,
    "audio_per_unit_micro_usd" BIGINT,
    "video_per_unit_micro_usd" BIGINT,
    "tool_call_per_unit_micro_usd" BIGINT,
    "search_call_per_unit_micro_usd" BIGINT,
    "cost_class" "CostClass" NOT NULL DEFAULT 'STANDARD',
    "confidence" "CostConfidence" NOT NULL DEFAULT 'UNKNOWN',
    "source" "ModelCostSource" NOT NULL DEFAULT 'SEED',
    "is_admin_override" BOOLEAN NOT NULL DEFAULT false,
    "local_compute_ownership" "LocalComputeOwnership",
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "active_key" TEXT,
    "effective_from" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "retired_at" TIMESTAMP(3),
    "last_verified_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by_user_id" TEXT,
    "notes" TEXT,

    CONSTRAINT "model_cost_versions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "model_cost_versions_active_key_key" ON "model_cost_versions"("active_key");

-- CreateIndex
CREATE INDEX "model_cost_versions_provider_model_key_idx" ON "model_cost_versions"("provider", "model_key");

-- CreateIndex
CREATE INDEX "model_cost_versions_is_active_idx" ON "model_cost_versions"("is_active");

-- CreateIndex
CREATE UNIQUE INDEX "model_cost_versions_provider_model_key_version_key" ON "model_cost_versions"("provider", "model_key", "version");

