-- ADR-176. Additive and idempotent: safe to run twice and against a database that already has any part of it.
--
-- 1. More worker slots. One row per job that may run at once across all replicas; the first
--    migration seeded two, which capped the whole service at two jobs.
INSERT INTO "thread_generation_worker_slots" ("slot_id")
VALUES ('threads-worker-3'), ('threads-worker-4'), ('threads-worker-5'), ('threads-worker-6')
ON CONFLICT ("slot_id") DO NOTHING;

-- 2. Bounded budget close retries: how many times a close failed and when to try next.
ALTER TABLE "thread_generation_jobs" ADD COLUMN IF NOT EXISTS "budget_close_attempts" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "thread_generation_jobs" ADD COLUMN IF NOT EXISTS "budget_close_next_at" TIMESTAMP(3);

CREATE INDEX IF NOT EXISTS "thread_generation_jobs_budget_close_sweep_idx"
  ON "thread_generation_jobs"("status", "budget_closed_at", "budget_close_next_at");

-- 3. Per-owner running count (the fair claim and the fair dispatch both read it).
CREATE INDEX IF NOT EXISTS "thread_generation_jobs_owner_id_status_idx"
  ON "thread_generation_jobs"("owner_id", "status");
