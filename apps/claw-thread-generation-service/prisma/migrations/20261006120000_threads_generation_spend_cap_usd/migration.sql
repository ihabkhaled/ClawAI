-- The first migration created "spend_cap_micro_credits" while the schema and every
-- query read "spend_cap_micro_usd". Rename it where it still has the old name so
-- both fresh installs and databases that already ran the first migration match.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = current_schema()
      AND table_name = 'thread_generation_jobs'
      AND column_name = 'spend_cap_micro_credits'
  ) THEN
    ALTER TABLE "thread_generation_jobs"
      RENAME COLUMN "spend_cap_micro_credits" TO "spend_cap_micro_usd";
  END IF;
END
$$;
