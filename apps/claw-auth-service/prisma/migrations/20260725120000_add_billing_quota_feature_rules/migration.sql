-- CreateEnum
CREATE TYPE "BillingIntervalKind" AS ENUM ('MONTHLY', 'YEARLY');

-- CreateEnum
CREATE TYPE "PlanModelAccessMode" AS ENUM ('ALLOW_ALL', 'DENY_ALL', 'ALLOW_LIST', 'ALLOW_COST_CLASSES', 'LEGACY_UNRESTRICTED');

-- CreateEnum
CREATE TYPE "PlanFeatureKey" AS ENUM ('COMPARE_MODE', 'JUDGE_MODE', 'RESEARCH_MODE', 'CRITIC_REVIEW', 'WORKSPACES', 'MEMORY', 'CONTEXT_PACKS');

-- CreateEnum
CREATE TYPE "PlanFeatureAccessMode" AS ENUM ('DISABLED', 'ENABLED', 'LIMITED');

-- CreateEnum
CREATE TYPE "PlanFeatureWindow" AS ENUM ('LIFETIME', 'DAY', 'WEEK', 'MONTH', 'BILLING_PERIOD');

-- CreateEnum
CREATE TYPE "EntitlementGrantType" AS ENUM ('PAID_SUBSCRIPTION', 'ADMIN_GRANT', 'PROMOTIONAL', 'MIGRATION', 'FREE_DEFAULT');

-- CreateEnum
CREATE TYPE "FeatureUsageState" AS ENUM ('RESERVED', 'CONSUMED', 'RELEASED');

-- CreateEnum
CREATE TYPE "WeightedUsageState" AS ENUM ('RESERVED', 'FINALIZED', 'RELEASED');

-- CreateEnum
CREATE TYPE "EntitlementInboxStatus" AS ENUM ('PENDING', 'PROCESSED', 'FAILED', 'SKIPPED');

-- CreateEnum
CREATE TYPE "SeedExecutionStatus" AS ENUM ('RUNNING', 'COMPLETED', 'FAILED');

-- AlterTable
ALTER TABLE "plans" ADD COLUMN     "allowed_cost_classes" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "max_concurrent_requests" INTEGER,
ADD COLUMN     "model_access_mode" "PlanModelAccessMode" NOT NULL DEFAULT 'LEGACY_UNRESTRICTED',
ADD COLUMN     "monthly_provider_cost_ceiling_micro_usd" BIGINT,
ADD COLUMN     "weekly_token_quota" INTEGER;

-- AlterTable
ALTER TABLE "user_plan_assignments" ADD COLUMN     "entitlement_valid_until" TIMESTAMP(3),
ADD COLUMN     "grant_reason" TEXT,
ADD COLUMN     "grant_type" "EntitlementGrantType" NOT NULL DEFAULT 'FREE_DEFAULT',
ADD COLUMN     "source_event_id" TEXT,
ADD COLUMN     "source_subscription_id" TEXT;

-- CreateTable
CREATE TABLE "plan_price_versions" (
    "id" TEXT NOT NULL,
    "plan_id" TEXT NOT NULL,
    "billing_interval" "BillingIntervalKind" NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "amount_minor" INTEGER NOT NULL,
    "version" INTEGER NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "active_key" TEXT,
    "effective_from" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "retired_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by_user_id" TEXT,

    CONSTRAINT "plan_price_versions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "plan_feature_rules" (
    "id" TEXT NOT NULL,
    "plan_id" TEXT NOT NULL,
    "feature" "PlanFeatureKey" NOT NULL,
    "access_mode" "PlanFeatureAccessMode" NOT NULL,
    "limit" INTEGER,
    "window" "PlanFeatureWindow" NOT NULL DEFAULT 'MONTH',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "plan_feature_rules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "feature_usage_records" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "plan_id" TEXT,
    "feature" "PlanFeatureKey" NOT NULL,
    "window" "PlanFeatureWindow" NOT NULL,
    "period_key" TEXT NOT NULL,
    "request_id" TEXT NOT NULL,
    "state" "FeatureUsageState" NOT NULL DEFAULT 'RESERVED',
    "reserved_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "consumed_at" TIMESTAMP(3),
    "released_at" TIMESTAMP(3),

    CONSTRAINT "feature_usage_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "weighted_usage_records" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "plan_id" TEXT,
    "subscription_id" TEXT,
    "reservation_id" TEXT NOT NULL,
    "request_id" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "workflow" TEXT,
    "raw_input_tokens" INTEGER NOT NULL DEFAULT 0,
    "raw_cached_tokens" INTEGER NOT NULL DEFAULT 0,
    "raw_reasoning_tokens" INTEGER NOT NULL DEFAULT 0,
    "raw_output_tokens" INTEGER NOT NULL DEFAULT 0,
    "tool_call_count" INTEGER NOT NULL DEFAULT 0,
    "weighted_tokens" INTEGER NOT NULL DEFAULT 0,
    "estimated_cost_micro_usd" BIGINT NOT NULL DEFAULT 0,
    "actual_cost_micro_usd" BIGINT,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "state" "WeightedUsageState" NOT NULL DEFAULT 'RESERVED',
    "day_key" TEXT NOT NULL,
    "week_key" TEXT NOT NULL,
    "month_key" TEXT NOT NULL,
    "billing_period_key" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finalized_at" TIMESTAMP(3),

    CONSTRAINT "weighted_usage_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "entitlement_inbox_events" (
    "id" TEXT NOT NULL,
    "event_id" TEXT NOT NULL,
    "event_type" TEXT NOT NULL,
    "schema_version" INTEGER NOT NULL,
    "producer" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "payload_json" JSONB NOT NULL,
    "status" "EntitlementInboxStatus" NOT NULL DEFAULT 'PENDING',
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "effective_at" TIMESTAMP(3) NOT NULL,
    "processed_at" TIMESTAMP(3),
    "last_error" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "entitlement_inbox_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "seed_executions" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "checksum" TEXT NOT NULL,
    "status" "SeedExecutionStatus" NOT NULL DEFAULT 'RUNNING',
    "started_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completed_at" TIMESTAMP(3),
    "last_error" TEXT,

    CONSTRAINT "seed_executions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "plan_price_versions_active_key_key" ON "plan_price_versions"("active_key");

-- CreateIndex
CREATE INDEX "plan_price_versions_plan_id_idx" ON "plan_price_versions"("plan_id");

-- CreateIndex
CREATE INDEX "plan_price_versions_is_active_idx" ON "plan_price_versions"("is_active");

-- CreateIndex
CREATE UNIQUE INDEX "plan_price_versions_plan_id_billing_interval_version_key" ON "plan_price_versions"("plan_id", "billing_interval", "version");

-- CreateIndex
CREATE INDEX "plan_feature_rules_plan_id_idx" ON "plan_feature_rules"("plan_id");

-- CreateIndex
CREATE UNIQUE INDEX "plan_feature_rules_plan_id_feature_key" ON "plan_feature_rules"("plan_id", "feature");

-- CreateIndex
CREATE INDEX "feature_usage_records_user_id_feature_period_key_state_idx" ON "feature_usage_records"("user_id", "feature", "period_key", "state");

-- CreateIndex
CREATE UNIQUE INDEX "feature_usage_records_user_id_feature_request_id_key" ON "feature_usage_records"("user_id", "feature", "request_id");

-- CreateIndex
CREATE UNIQUE INDEX "weighted_usage_records_reservation_id_key" ON "weighted_usage_records"("reservation_id");

-- CreateIndex
CREATE INDEX "weighted_usage_records_user_id_day_key_idx" ON "weighted_usage_records"("user_id", "day_key");

-- CreateIndex
CREATE INDEX "weighted_usage_records_user_id_week_key_idx" ON "weighted_usage_records"("user_id", "week_key");

-- CreateIndex
CREATE INDEX "weighted_usage_records_user_id_month_key_idx" ON "weighted_usage_records"("user_id", "month_key");

-- CreateIndex
CREATE INDEX "weighted_usage_records_state_created_at_idx" ON "weighted_usage_records"("state", "created_at");

-- CreateIndex
CREATE INDEX "weighted_usage_records_request_id_idx" ON "weighted_usage_records"("request_id");

-- CreateIndex
CREATE UNIQUE INDEX "entitlement_inbox_events_event_id_key" ON "entitlement_inbox_events"("event_id");

-- CreateIndex
CREATE INDEX "entitlement_inbox_events_status_created_at_idx" ON "entitlement_inbox_events"("status", "created_at");

-- CreateIndex
CREATE INDEX "entitlement_inbox_events_user_id_idx" ON "entitlement_inbox_events"("user_id");

-- CreateIndex
CREATE INDEX "seed_executions_status_idx" ON "seed_executions"("status");

-- CreateIndex
CREATE UNIQUE INDEX "seed_executions_name_version_key" ON "seed_executions"("name", "version");

-- AddForeignKey
ALTER TABLE "plan_price_versions" ADD CONSTRAINT "plan_price_versions_plan_id_fkey" FOREIGN KEY ("plan_id") REFERENCES "plans"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "plan_feature_rules" ADD CONSTRAINT "plan_feature_rules_plan_id_fkey" FOREIGN KEY ("plan_id") REFERENCES "plans"("id") ON DELETE CASCADE ON UPDATE CASCADE;

