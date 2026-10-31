-- ADR-205: the owner "My Threads" list filters and counts in SQL, so the last known state of the
-- generation job is kept on the publication row. Additive and idempotent: new nullable columns, no
-- rewrite of existing rows. Existing rows stay NULL ("not read yet"); the owner list reads the job
-- once per row and stores the answer. New rows default to GENERATING.
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'PublicationGenerationState') THEN
    CREATE TYPE "PublicationGenerationState" AS ENUM ('GENERATING', 'FAILED', 'CANCELLED', 'DONE');
  END IF;
END
$$;

ALTER TABLE "thread_publications"
  ADD COLUMN IF NOT EXISTS "generation_state" "PublicationGenerationState",
  ADD COLUMN IF NOT EXISTS "generation_failure_code" VARCHAR(64),
  ADD COLUMN IF NOT EXISTS "generation_failure_step" VARCHAR(64),
  ADD COLUMN IF NOT EXISTS "generation_failure_retryable" BOOLEAN,
  ADD COLUMN IF NOT EXISTS "generation_state_checked_at" TIMESTAMP(3);

-- The default applies to rows inserted from now on; rows that exist keep NULL.
ALTER TABLE "thread_publications"
  ALTER COLUMN "generation_state" SET DEFAULT 'GENERATING';
