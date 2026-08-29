-- ADR-083 amends ADR-066: CREDIT_TOPUP is the THIRD purpose class, not merely
-- the fifth member. It carries no plan fields (like PAYMENT_METHOD_SETUP) but
-- does carry a real amount (like a subscription), so it satisfies NEITHER
-- branch of the constraint added by 20260727013000 and widened by 20260728150000.
-- Adding the enum member without this migration makes every top-up insert fail.

-- The constraint is dropped BEFORE the enum is rebuilt: its expression compares
-- the column against enum literals, and re-typing the column underneath a live
-- CHECK is not worth relying on.
ALTER TABLE "checkout_sessions"
  DROP CONSTRAINT IF EXISTS "checkout_sessions_purpose_fields_check";

-- Rename-and-recreate rather than `ALTER TYPE ... ADD VALUE`. Prisma runs a
-- migration file inside one transaction, and PostgreSQL refuses to USE an enum
-- value added in the same transaction that added it — which the new CHECK
-- branch below does on its very first line. Swapping the type is the only form
-- that is safe in a single transaction. `checkout_sessions.purpose` is the only
-- column of this type.
ALTER TYPE "CheckoutSessionPurpose" RENAME TO "CheckoutSessionPurpose_old";

CREATE TYPE "CheckoutSessionPurpose" AS ENUM (
  'NEW_SUBSCRIPTION',
  'UPGRADE',
  'RENEWAL',
  'PAYMENT_METHOD_SETUP',
  'CREDIT_TOPUP'
);

ALTER TABLE "checkout_sessions"
  ALTER COLUMN "purpose" TYPE "CheckoutSessionPurpose"
    USING "purpose"::text::"CheckoutSessionPurpose";

DROP TYPE "CheckoutSessionPurpose_old";

-- What was bought, frozen onto the session. `credit_package_version_id` is the
-- IMMUTABLE priced row: retaining it is what stops a later reprice from
-- rewriting how much credit a completed purchase was owed.
--
-- `credit_micro_usd` is BIGINT because credit is integer micro-USD and a large
-- package exceeds INTEGER. Money is never a float, here or anywhere.
--
-- `payment_transactions.type` is a TEXT column, not a PostgreSQL enum, so
-- PaymentTransactionType.CREDIT_TOPUP needs no database change. Only
-- CheckoutSessionPurpose is enum-typed.
ALTER TABLE "checkout_sessions"
  ADD COLUMN "credit_package_id" TEXT,
  ADD COLUMN "credit_package_version_id" TEXT,
  ADD COLUMN "credit_micro_usd" BIGINT;

-- Three branches. The two pre-existing ones are reproduced verbatim and then
-- extended to require the three credit columns be NULL, so a subscription or a
-- card-setup row can never carry credit fields — a half-typed row that looks
-- like both would otherwise be valid, and the activation branch is chosen from
-- exactly these fields.
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
      AND "credit_package_id" IS NULL
      AND "credit_package_version_id" IS NULL
      AND "credit_micro_usd" IS NULL
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
      AND "credit_package_id" IS NULL
      AND "credit_package_version_id" IS NULL
      AND "credit_micro_usd" IS NULL
    )
    OR
    (
      "purpose" = 'CREDIT_TOPUP'
      AND "plan_id" IS NULL
      AND "plan_slug" IS NULL
      AND "plan_price_version_id" IS NULL
      AND "billing_interval" IS NULL
      AND "subscription_id" IS NULL
      AND "proration_quote_id" IS NULL
      AND "base_amount_minor" IS NOT NULL
      AND "base_amount_minor" > 0
      AND "base_currency" IS NOT NULL
      AND "charge_amount_minor" IS NOT NULL
      AND "charge_amount_minor" > 0
      AND "charge_currency" IS NOT NULL
      AND "credit_package_id" IS NOT NULL
      AND "credit_package_version_id" IS NOT NULL
      AND "credit_micro_usd" IS NOT NULL
      AND "credit_micro_usd" > 0
    )
  );
