CREATE TYPE "CheckoutSessionPurpose" AS ENUM (
  'NEW_SUBSCRIPTION',
  'UPGRADE',
  'RENEWAL',
  'PAYMENT_METHOD_SETUP'
);

ALTER TABLE "checkout_sessions"
  ALTER COLUMN "purpose" TYPE "CheckoutSessionPurpose"
    USING "purpose"::"CheckoutSessionPurpose",
  ALTER COLUMN "plan_id" DROP NOT NULL,
  ALTER COLUMN "plan_slug" DROP NOT NULL,
  ALTER COLUMN "plan_price_version_id" DROP NOT NULL,
  ALTER COLUMN "billing_interval" DROP NOT NULL,
  ALTER COLUMN "base_amount_minor" DROP NOT NULL,
  ALTER COLUMN "base_currency" DROP NOT NULL,
  ALTER COLUMN "charge_amount_minor" DROP NOT NULL,
  ALTER COLUMN "charge_currency" DROP NOT NULL,
  ADD COLUMN "payment_method_consented_at" TIMESTAMP(3);

ALTER TABLE "checkout_sessions"
  ADD CONSTRAINT "checkout_sessions_purpose_fields_check"
  CHECK (
    (
      "purpose" = 'PAYMENT_METHOD_SETUP'
      AND "plan_id" IS NULL
      AND "plan_slug" IS NULL
      AND "plan_price_version_id" IS NULL
      AND "billing_interval" IS NULL
      AND "base_amount_minor" IS NULL
      AND "base_currency" IS NULL
      AND "charge_amount_minor" IS NULL
      AND "charge_currency" IS NULL
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
