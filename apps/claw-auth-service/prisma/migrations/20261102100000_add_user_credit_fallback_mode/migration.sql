-- Per-user "used-up credit model" behaviour (ADR-161).
--
-- FALLBACK is what every account experiences today (answer from an included model
-- with a notice), so the default changes nothing for anyone. Idempotent.

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'CreditFallbackMode') THEN
    CREATE TYPE "CreditFallbackMode" AS ENUM ('FALLBACK', 'STOP');
  END IF;
END
$$;

ALTER TABLE "users"
  ADD COLUMN IF NOT EXISTS "credit_fallback_mode" "CreditFallbackMode" NOT NULL DEFAULT 'FALLBACK';
