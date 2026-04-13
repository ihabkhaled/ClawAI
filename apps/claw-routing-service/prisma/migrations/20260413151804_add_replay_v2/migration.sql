-- CreateEnum
CREATE TYPE "OutcomeLabel" AS ENUM ('CORRECT_IMPROVEMENT', 'BAD_REGRESSION', 'COST_WIN', 'QUALITY_WIN', 'UNCERTAIN');

-- CreateTable
CREATE TABLE "replay_runs" (
    "id" TEXT NOT NULL,
    "name" TEXT,
    "filters" JSONB NOT NULL,
    "total_replayed" INTEGER NOT NULL,
    "changed_count" INTEGER NOT NULL,
    "suspicious_count" INTEGER NOT NULL,
    "avg_conf_old" DECIMAL(5,4) NOT NULL,
    "avg_conf_new" DECIMAL(5,4) NOT NULL,
    "avg_improvement" DECIMAL(6,4) NOT NULL,
    "label_breakdown" JSONB NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "replay_runs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "replay_cases" (
    "id" TEXT NOT NULL,
    "run_id" TEXT NOT NULL,
    "decision_id" TEXT,
    "message_preview" TEXT NOT NULL,
    "message_content" TEXT,
    "has_original_content" BOOLEAN NOT NULL,
    "old_provider" TEXT NOT NULL,
    "old_model" TEXT NOT NULL,
    "old_confidence" DECIMAL(5,4),
    "old_cost_class" TEXT,
    "new_provider" TEXT NOT NULL,
    "new_model" TEXT NOT NULL,
    "new_confidence" DECIMAL(5,4) NOT NULL,
    "new_cost_class" TEXT NOT NULL,
    "changed" BOOLEAN NOT NULL,
    "improvement_score" DECIMAL(6,4) NOT NULL,
    "outcome_label" "OutcomeLabel" NOT NULL,
    "is_suspicious" BOOLEAN NOT NULL,
    "suspicious_reasons" TEXT[],
    "is_confirmed_regression" BOOLEAN NOT NULL DEFAULT false,
    "review_notes" TEXT,
    "is_promoted" BOOLEAN NOT NULL DEFAULT false,
    "reviewed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "replay_cases_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "replay_runs_created_at_idx" ON "replay_runs"("created_at");

-- CreateIndex
CREATE INDEX "replay_cases_run_id_idx" ON "replay_cases"("run_id");

-- CreateIndex
CREATE INDEX "replay_cases_is_suspicious_idx" ON "replay_cases"("is_suspicious");

-- CreateIndex
CREATE INDEX "replay_cases_outcome_label_idx" ON "replay_cases"("outcome_label");

-- CreateIndex
CREATE INDEX "replay_cases_is_confirmed_regression_idx" ON "replay_cases"("is_confirmed_regression");

-- AddForeignKey
ALTER TABLE "replay_cases" ADD CONSTRAINT "replay_cases_run_id_fkey" FOREIGN KEY ("run_id") REFERENCES "replay_runs"("id") ON DELETE CASCADE ON UPDATE CASCADE;
