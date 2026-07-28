ALTER TABLE "checkout_sessions"
  DROP CONSTRAINT IF EXISTS "checkout_sessions_purpose_fields_check";

UPDATE "checkout_sessions"
SET
  "base_amount_minor" = 10,
  "base_currency" = 'EGP',
  "charge_amount_minor" = 10,
  "charge_currency" = 'EGP'
WHERE "purpose" = 'PAYMENT_METHOD_SETUP';

ALTER TABLE "checkout_sessions"
  ADD CONSTRAINT "checkout_sessions_purpose_fields_check"
  CHECK (
    (
      "purpose" = 'PAYMENT_METHOD_SETUP'
      AND "plan_id" IS NULL
      AND "plan_slug" IS NULL
      AND "plan_price_version_id" IS NULL
      AND "billing_interval" IS NULL
      AND "base_amount_minor" IS NOT NULL
      AND "base_amount_minor" > 0
      AND "base_currency" IS NOT NULL
      AND "charge_amount_minor" IS NOT NULL
      AND "charge_amount_minor" > 0
      AND "charge_currency" IS NOT NULL
      AND "fx_quote_id" IS NULL
      AND "fx_final_rate_scaled" IS NULL
      AND "subscription_id" IS NULL
      AND "proration_quote_id" IS NULL
      AND "payment_method_consented_at" IS NOT NULL
    )
    OR
    (
      "purpose" IN ('NEW_SUBSCRIPTION', 'UPGRADE', 'RENEWAL')
      AND "plan_id" IS NOT NULL
      AND "plan_slug" IS NOT NULL
      AND "plan_price_version_id" IS NOT NULL
      AND "billing_interval" IS NOT NULL
      AND "base_amount_minor" IS NOT NULL
      AND "base_currency" IS NOT NULL
      AND "charge_amount_minor" IS NOT NULL
      AND "charge_currency" IS NOT NULL
    )
  );
