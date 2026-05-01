-- Stream 12: Auto-Suggest Scheduler

CREATE TYPE "AutoSuggestRunStatus" AS ENUM ('RUNNING', 'COMPLETED', 'FAILED');

CREATE TABLE "auto_suggest_runs" (
  "id" TEXT NOT NULL,
  "job_type" VARCHAR(64) NOT NULL,
  "status" "AutoSuggestRunStatus" NOT NULL,
  "started_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "completed_at" TIMESTAMP(3),
  "candidate_count" INTEGER NOT NULL DEFAULT 0,
  "suggestions_created" INTEGER NOT NULL DEFAULT 0,
  "duration_ms" INTEGER,
  "error_message" VARCHAR(2000),
  CONSTRAINT "auto_suggest_runs_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "auto_suggest_runs_job_type_started_at_idx"
  ON "auto_suggest_runs"("job_type", "started_at");
CREATE INDEX "auto_suggest_runs_status_started_at_idx"
  ON "auto_suggest_runs"("status", "started_at");

CREATE TABLE "suggestion_deduplication" (
  "id" TEXT NOT NULL,
  "user_id" VARCHAR(128) NOT NULL,
  "source_object_id" TEXT NOT NULL,
  "action_kind" VARCHAR(64) NOT NULL,
  "job_type" VARCHAR(64),
  "suggested_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "expires_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "suggestion_deduplication_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "suggestion_deduplication_user_id_source_object_id_action_ki_key"
  ON "suggestion_deduplication"("user_id", "source_object_id", "action_kind");
CREATE INDEX "suggestion_deduplication_expires_at_idx"
  ON "suggestion_deduplication"("expires_at");
