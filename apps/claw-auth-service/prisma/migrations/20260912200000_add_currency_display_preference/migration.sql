-- Display-currency preference.
--
-- Presentation state. Nothing here can change a charge, an invoice, a refund or
-- a wallet balance — see ADR-097 and rules/45.

CREATE TYPE "CurrencyPreferenceMode" AS ENUM ('AUTO', 'MANUAL');

-- AUTO for every existing user, which is exactly what they experience today:
-- prices in the canonical currency until they are detected or they choose.
ALTER TABLE "users"
  ADD COLUMN "currency_preference_mode" "CurrencyPreferenceMode" NOT NULL DEFAULT 'AUTO',
  ADD COLUMN "preferred_country_code" VARCHAR(2),
  ADD COLUMN "preferred_currency_code" VARCHAR(3);
