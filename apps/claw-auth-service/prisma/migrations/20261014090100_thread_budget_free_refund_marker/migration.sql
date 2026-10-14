-- ADR-162 addendum: marks that the free-meter money of a platform-failed job was given back,
-- so the refund happens exactly once (claimed in the same transaction that returns the money).
ALTER TABLE "thread_job_budgets" ADD COLUMN IF NOT EXISTS "free_refunded_at" TIMESTAMP(3);
