-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "ThreadGenerationStatus" AS ENUM ('QUEUED', 'RUNNING', 'WAITING_FOR_REVIEW', 'COMPLETED', 'FAILED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "ThreadGenerationStage" AS ENUM ('SNAPSHOT', 'RESEARCH', 'AUTHOR_DRAFTS', 'CONSENSUS', 'JUDGE', 'CRITIC', 'REVISION', 'READY_FOR_REVIEW');

-- CreateTable
CREATE TABLE "thread_generation_jobs" (
    "id" TEXT NOT NULL,
    "owner_id" TEXT NOT NULL,
    "correlation_id" TEXT NOT NULL,
    "idempotency_key" TEXT NOT NULL,
    "status" "ThreadGenerationStatus" NOT NULL DEFAULT 'QUEUED',
    "stage" "ThreadGenerationStage" NOT NULL DEFAULT 'SNAPSHOT',
    "source_thread_id" TEXT NOT NULL,
    "source_snapshot" JSONB NOT NULL,
    "source_snapshot_hash" TEXT NOT NULL,
    "evidence_bundle" JSONB,
    "evidence_bundle_hash" TEXT,
    "evidence_version" INTEGER,
    "request" JSONB NOT NULL,
    "spend_cap_micro_credits" BIGINT NOT NULL,
    "budget_id" TEXT NOT NULL,
    "spent_micro_credits" BIGINT NOT NULL DEFAULT 0,
    "round" INTEGER NOT NULL DEFAULT 0,
    "attempt_count" INTEGER NOT NULL DEFAULT 0,
    "lease_owner" TEXT,
    "lease_expires_at" TIMESTAMP(3),
    "cancel_requested_at" TIMESTAMP(3),
    "safe_error_code" TEXT,
    "public_intent_version" TEXT NOT NULL,
    "public_intent_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "completed_at" TIMESTAMP(3),

    CONSTRAINT "thread_generation_jobs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "thread_generation_attempts" (
    "id" TEXT NOT NULL,
    "job_id" TEXT NOT NULL,
    "attempt" INTEGER NOT NULL,
    "worker_id" TEXT NOT NULL,
    "started_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "heartbeat_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finished_at" TIMESTAMP(3),
    "outcome" TEXT,
    "safe_error_code" TEXT,

    CONSTRAINT "thread_generation_attempts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "thread_generation_checkpoints" (
    "id" TEXT NOT NULL,
    "job_id" TEXT NOT NULL,
    "stage" "ThreadGenerationStage" NOT NULL,
    "round" INTEGER NOT NULL DEFAULT 0,
    "data" JSONB NOT NULL,
    "data_hash" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "thread_generation_checkpoints_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "thread_model_communications" (
    "id" TEXT NOT NULL,
    "job_id" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "round" INTEGER NOT NULL,
    "model_key" TEXT NOT NULL,
    "provider_key" TEXT NOT NULL,
    "input_hash" TEXT NOT NULL,
    "evidence_bundle_hash" TEXT NOT NULL,
    "output" JSONB NOT NULL,
    "output_hash" TEXT NOT NULL,
    "usage" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "thread_model_communications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "thread_revision_drafts" (
    "id" TEXT NOT NULL,
    "job_id" TEXT NOT NULL,
    "revision" INTEGER NOT NULL,
    "round" INTEGER NOT NULL,
    "content" JSONB NOT NULL,
    "content_hash" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "thread_revision_drafts_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "thread_generation_jobs_idempotency_key_key" ON "thread_generation_jobs"("idempotency_key");

-- CreateIndex
CREATE INDEX "thread_generation_jobs_status_created_at_idx" ON "thread_generation_jobs"("status", "created_at");

-- CreateIndex
CREATE INDEX "thread_generation_jobs_status_lease_expires_at_idx" ON "thread_generation_jobs"("status", "lease_expires_at");

-- CreateIndex
CREATE INDEX "thread_generation_jobs_owner_id_created_at_idx" ON "thread_generation_jobs"("owner_id", "created_at");

-- CreateIndex
CREATE INDEX "thread_generation_attempts_heartbeat_at_idx" ON "thread_generation_attempts"("heartbeat_at");

-- CreateIndex
CREATE UNIQUE INDEX "thread_generation_attempts_job_id_attempt_key" ON "thread_generation_attempts"("job_id", "attempt");

-- CreateIndex
CREATE UNIQUE INDEX "thread_generation_checkpoints_job_id_stage_round_key" ON "thread_generation_checkpoints"("job_id", "stage", "round");

-- CreateIndex
CREATE INDEX "thread_model_communications_job_id_round_role_idx" ON "thread_model_communications"("job_id", "round", "role");

-- CreateIndex
CREATE UNIQUE INDEX "thread_revision_drafts_job_id_revision_key" ON "thread_revision_drafts"("job_id", "revision");

-- AddForeignKey
ALTER TABLE "thread_generation_attempts" ADD CONSTRAINT "thread_generation_attempts_job_id_fkey" FOREIGN KEY ("job_id") REFERENCES "thread_generation_jobs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "thread_generation_checkpoints" ADD CONSTRAINT "thread_generation_checkpoints_job_id_fkey" FOREIGN KEY ("job_id") REFERENCES "thread_generation_jobs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "thread_model_communications" ADD CONSTRAINT "thread_model_communications_job_id_fkey" FOREIGN KEY ("job_id") REFERENCES "thread_generation_jobs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "thread_revision_drafts" ADD CONSTRAINT "thread_revision_drafts_job_id_fkey" FOREIGN KEY ("job_id") REFERENCES "thread_generation_jobs"("id") ON DELETE CASCADE ON UPDATE CASCADE;
