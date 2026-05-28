-- CreateEnum
CREATE TYPE "PlanAssignmentStatus" AS ENUM ('ACTIVE', 'CANCELLED', 'EXPIRED', 'PAUSED');

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "active_plan_id" TEXT;

-- CreateTable
CREATE TABLE "plans" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "price_monthly" DECIMAL(12,2),
    "price_yearly" DECIMAL(12,2),
    "currency" TEXT DEFAULT 'USD',
    "display_order" INTEGER NOT NULL DEFAULT 0,
    "is_default" BOOLEAN NOT NULL DEFAULT false,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "is_public" BOOLEAN NOT NULL DEFAULT true,
    "daily_token_quota" INTEGER NOT NULL DEFAULT 0,
    "monthly_token_quota" INTEGER,
    "max_chats_per_day" INTEGER,
    "max_messages_per_day" INTEGER,
    "max_workspace_connections" INTEGER,
    "max_context_packs" INTEGER,
    "max_memory_items" INTEGER,
    "allow_compare_mode" BOOLEAN NOT NULL DEFAULT false,
    "allow_judge_mode" BOOLEAN NOT NULL DEFAULT false,
    "allow_workspaces" BOOLEAN NOT NULL DEFAULT true,
    "allow_memory" BOOLEAN NOT NULL DEFAULT true,
    "allow_context_packs" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "plans_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "plan_model_access" (
    "id" TEXT NOT NULL,
    "plan_id" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "is_allowed" BOOLEAN NOT NULL DEFAULT true,
    "allow_as_primary" BOOLEAN NOT NULL DEFAULT true,
    "allow_as_fallback" BOOLEAN NOT NULL DEFAULT true,
    "allow_as_judge" BOOLEAN NOT NULL DEFAULT false,
    "allow_in_compare" BOOLEAN NOT NULL DEFAULT true,
    "daily_token_limit_override" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "plan_model_access_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_plan_assignments" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "plan_id" TEXT NOT NULL,
    "status" "PlanAssignmentStatus" NOT NULL DEFAULT 'ACTIVE',
    "assigned_by_user_id" TEXT,
    "starts_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ends_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_plan_assignments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "token_usage_ledger" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "plan_id" TEXT,
    "date" TEXT NOT NULL,
    "input_tokens" INTEGER NOT NULL DEFAULT 0,
    "output_tokens" INTEGER NOT NULL DEFAULT 0,
    "total_tokens" INTEGER NOT NULL DEFAULT 0,
    "request_count" INTEGER NOT NULL DEFAULT 0,
    "model_breakdown" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "token_usage_ledger_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "plans_slug_key" ON "plans"("slug");

-- CreateIndex
CREATE INDEX "plans_is_active_idx" ON "plans"("is_active");

-- CreateIndex
CREATE INDEX "plans_display_order_idx" ON "plans"("display_order");

-- CreateIndex
CREATE INDEX "plan_model_access_plan_id_idx" ON "plan_model_access"("plan_id");

-- CreateIndex
CREATE UNIQUE INDEX "plan_model_access_plan_id_provider_model_key" ON "plan_model_access"("plan_id", "provider", "model");

-- CreateIndex
CREATE INDEX "user_plan_assignments_user_id_idx" ON "user_plan_assignments"("user_id");

-- CreateIndex
CREATE INDEX "user_plan_assignments_plan_id_idx" ON "user_plan_assignments"("plan_id");

-- CreateIndex
CREATE INDEX "user_plan_assignments_status_idx" ON "user_plan_assignments"("status");

-- CreateIndex
CREATE INDEX "token_usage_ledger_user_id_idx" ON "token_usage_ledger"("user_id");

-- CreateIndex
CREATE INDEX "token_usage_ledger_date_idx" ON "token_usage_ledger"("date");

-- CreateIndex
CREATE UNIQUE INDEX "token_usage_ledger_user_id_date_key" ON "token_usage_ledger"("user_id", "date");

-- CreateIndex
CREATE INDEX "users_active_plan_id_idx" ON "users"("active_plan_id");

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_active_plan_id_fkey" FOREIGN KEY ("active_plan_id") REFERENCES "plans"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "plan_model_access" ADD CONSTRAINT "plan_model_access_plan_id_fkey" FOREIGN KEY ("plan_id") REFERENCES "plans"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_plan_assignments" ADD CONSTRAINT "user_plan_assignments_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_plan_assignments" ADD CONSTRAINT "user_plan_assignments_plan_id_fkey" FOREIGN KEY ("plan_id") REFERENCES "plans"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
