-- Links a retry to the job it retries. Additive: one nullable column and a unique index, so two
-- concurrent retries of the same job cannot both be stored (NULLs never collide in PostgreSQL).
ALTER TABLE "thread_generation_jobs" ADD COLUMN "retried_from_job_id" TEXT;

CREATE UNIQUE INDEX "thread_generation_jobs_retried_from_job_id_key" ON "thread_generation_jobs"("retried_from_job_id");
