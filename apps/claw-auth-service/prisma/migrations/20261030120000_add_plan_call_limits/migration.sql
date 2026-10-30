-- Per-call limits for requests the platform pays for (ADR-197).
--
-- All three are nullable: NULL = no cap, 0 = refuse every call, never
-- interchangeable. The columns are added empty on purpose; the values are written by
-- prisma/seeders/plan-call-limits.seeder.cjs, which only fills a NULL so a figure an
-- administrator has set is never overwritten.
ALTER TABLE "plans"
  ADD COLUMN "max_input_tokens_per_call" INTEGER,
  ADD COLUMN "max_output_tokens_per_call" INTEGER,
  ADD COLUMN "max_cost_per_call_micro_usd" BIGINT;
