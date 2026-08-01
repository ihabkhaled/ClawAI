CREATE TYPE "PlanLifecycleStatus" AS ENUM ('ACTIVE', 'RETIRED');
CREATE TYPE "PlanRetirementMigrationStatus" AS ENUM (
  'APPLIED',
  'BILLING_SCHEDULE_PENDING',
  'BILLING_SCHEDULED',
  'SUPERSEDED',
  'FAILED'
);

ALTER TABLE "plans"
  ADD COLUMN "lifecycle_status" "PlanLifecycleStatus" NOT NULL DEFAULT 'ACTIVE',
  ADD COLUMN "replacement_plan_id" TEXT,
  ADD COLUMN "retired_at" TIMESTAMP(3);

CREATE TABLE "plan_retirement_migrations" (
  "id" TEXT NOT NULL,
  "source_assignment_id" TEXT NOT NULL,
  "user_id" TEXT NOT NULL,
  "source_plan_id" TEXT NOT NULL,
  "replacement_plan_id" TEXT NOT NULL,
  "replacement_assignment_id" TEXT NOT NULL,
  "source_subscription_id" TEXT,
  "status" "PlanRetirementMigrationStatus" NOT NULL,
  "error_code" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "plan_retirement_migrations_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "plan_retirement_migrations_source_assignment_id_key"
  ON "plan_retirement_migrations"("source_assignment_id");
CREATE UNIQUE INDEX "plan_retirement_migrations_replacement_assignment_id_key"
  ON "plan_retirement_migrations"("replacement_assignment_id");
CREATE INDEX "plan_retirement_migrations_source_plan_id_status_idx"
  ON "plan_retirement_migrations"("source_plan_id", "status");
CREATE INDEX "plan_retirement_migrations_source_subscription_id_idx"
  ON "plan_retirement_migrations"("source_subscription_id");
