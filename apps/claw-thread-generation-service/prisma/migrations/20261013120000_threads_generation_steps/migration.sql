-- Owner-only step log for a generation job. Additive: one new table, no change to existing rows.
CREATE TABLE "thread_generation_steps" (
  "id" TEXT NOT NULL,
  "job_id" TEXT NOT NULL,
  "seq" INTEGER NOT NULL,
  "at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "stage" TEXT NOT NULL,
  "round" INTEGER NOT NULL DEFAULT 0,
  "outcome" TEXT NOT NULL,
  "role_kind" TEXT NOT NULL,
  "role_id" TEXT,
  "provider" TEXT,
  "model" TEXT,
  "code" TEXT,
  "http_status" INTEGER,
  "duration_ms" INTEGER,
  "input_tokens" INTEGER,
  "output_tokens" INTEGER,
  "excerpt" VARCHAR(1200),

  CONSTRAINT "thread_generation_steps_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "thread_generation_steps_job_id_seq_key" ON "thread_generation_steps"("job_id", "seq");
CREATE INDEX "thread_generation_steps_job_id_idx" ON "thread_generation_steps"("job_id");

ALTER TABLE "thread_generation_steps"
  ADD CONSTRAINT "thread_generation_steps_job_id_fkey"
  FOREIGN KEY ("job_id") REFERENCES "thread_generation_jobs"("id") ON DELETE CASCADE ON UPDATE CASCADE;
