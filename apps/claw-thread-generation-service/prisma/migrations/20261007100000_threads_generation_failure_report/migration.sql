-- A job that ends FAILED is reported to operators exactly once. `failure_summary` is a
-- short safe description of the last error; `failure_reported_at` is the outbox marker the
-- recovery pass uses to publish the event, so a crash between failing and publishing
-- never loses the report.
ALTER TABLE "thread_generation_jobs" ADD COLUMN "failure_summary" VARCHAR(400);
ALTER TABLE "thread_generation_jobs" ADD COLUMN "failure_reported_at" TIMESTAMP(3);

CREATE INDEX "thread_generation_jobs_status_failure_reported_at_idx"
  ON "thread_generation_jobs"("status", "failure_reported_at");
