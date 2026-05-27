-- Pull job resilience: add INSTALLING status, phase enum, install + retry tracking columns.

-- AlterEnum: add INSTALLING value (Postgres requires this in its own statement)
ALTER TYPE "PullJobStatus" ADD VALUE IF NOT EXISTS 'INSTALLING';

-- CreateEnum
DO $$ BEGIN
  CREATE TYPE "PullJobPhase" AS ENUM ('QUEUED', 'DOWNLOADING', 'INSTALLING', 'FINALIZING', 'DONE');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- AlterTable
ALTER TABLE "pull_jobs"
  ADD COLUMN IF NOT EXISTS "phase" "PullJobPhase" NOT NULL DEFAULT 'QUEUED',
  ADD COLUMN IF NOT EXISTS "install_step" TEXT,
  ADD COLUMN IF NOT EXISTS "install_attempts" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "retry_attempts" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "resumed_at" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "last_progress_at" TIMESTAMP(3);
