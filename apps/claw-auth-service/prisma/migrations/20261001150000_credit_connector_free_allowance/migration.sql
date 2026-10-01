-- ADR-142: free requests on credit connectors.
--
-- A Free account gets N requests per UTC month on EACH credit connector, absorbed
-- by the platform when the user has no credit to cover a token-priced call. N is a
-- per-plan setting: NULL = unlimited, 0 = none.

-- The ledger gains a zero-amount kind that records the admission / the give-back.
ALTER TYPE "CreditLedgerKind" ADD VALUE IF NOT EXISTS 'FREE_ALLOWANCE';

-- The plan setting, plus the seed for the existing Free plan. Both happen ONLY
-- when the column is created here (guarded on the catalog), so a re-run can never
-- overwrite a value an administrator has since edited. DEFAULT 0: a plan created
-- without the field gives nothing away.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'plans' AND column_name = 'credit_connector_free_requests_per_month'
  ) THEN
    ALTER TABLE "plans" ADD COLUMN "credit_connector_free_requests_per_month" INTEGER DEFAULT 0;
    ALTER TABLE "plans" ADD CONSTRAINT "plans_credit_connector_free_requests_check"
      CHECK ("credit_connector_free_requests_per_month" IS NULL
             OR "credit_connector_free_requests_per_month" >= 0);
    -- Free: 2 per credit connector per month. Every other plan pays with credit: 0.
    UPDATE "plans" SET "credit_connector_free_requests_per_month" = 2 WHERE "slug" = 'free';
  END IF;
END $$;

-- A reservation row that was admitted on the allowance (no wallet hold behind it).
ALTER TABLE "weighted_usage_records"
  ADD COLUMN IF NOT EXISTS "is_free_allowance" BOOLEAN NOT NULL DEFAULT false;

-- The atomic counter. Unique (user, provider, month) is what makes the
-- increment-if-below race-safe.
CREATE TABLE IF NOT EXISTS "credit_free_allowance_usage" (
  "id" TEXT NOT NULL,
  "user_id" TEXT NOT NULL,
  "provider" TEXT NOT NULL,
  "period_key" TEXT NOT NULL,
  "used_count" INTEGER NOT NULL DEFAULT 0,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "credit_free_allowance_usage_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "credit_free_allowance_usage_user_id_provider_period_key_key"
  ON "credit_free_allowance_usage"("user_id", "provider", "period_key");
CREATE INDEX IF NOT EXISTS "credit_free_allowance_usage_user_id_period_key_idx"
  ON "credit_free_allowance_usage"("user_id", "period_key");
