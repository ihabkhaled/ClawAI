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
ALTER TABLE "PullJob"
  ADD COLUMN IF NOT EXISTS "phase" "PullJobPhase" NOT NULL DEFAULT 'QUEUED',
  ADD COLUMN IF NOT EXISTS "installStep" TEXT,
  ADD COLUMN IF NOT EXISTS "installAttempts" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "retryAttempts" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "resumedAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "lastProgressAt" TIMESTAMP(3);
