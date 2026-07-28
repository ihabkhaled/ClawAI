ALTER TABLE "refunds"
  ALTER COLUMN "subscription_id" DROP NOT NULL,
  ADD COLUMN "provider_amount_minor" INTEGER,
  ADD COLUMN "provider_currency" TEXT,
  ADD COLUMN "automatic" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "attempts" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "next_attempt_at" TIMESTAMP(3);

UPDATE "refunds"
SET
  "provider_amount_minor" = "amount_minor",
  "provider_currency" = "currency";

ALTER TABLE "refunds"
  ALTER COLUMN "provider_amount_minor" SET NOT NULL,
  ALTER COLUMN "provider_currency" SET NOT NULL,
  ADD CONSTRAINT "refunds_provider_amount_positive_check"
    CHECK ("provider_amount_minor" > 0),
  ADD CONSTRAINT "refunds_provider_currency_check"
    CHECK ("provider_currency" ~ '^[A-Z]{3}$'),
  ADD CONSTRAINT "refunds_attempts_non_negative_check"
    CHECK ("attempts" >= 0);

CREATE INDEX "refunds_automatic_status_next_attempt_at_idx"
  ON "refunds"("automatic", "status", "next_attempt_at");

CREATE OR REPLACE FUNCTION "enforce_refund_balance"()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  captured_amount INTEGER;
  captured_currency TEXT;
  captured_provider_amount INTEGER;
  captured_provider_currency TEXT;
  reserved_amount BIGINT;
  reserved_provider_amount BIGINT;
BEGIN
  IF NEW.status NOT IN ('PENDING', 'SUCCEEDED') THEN
    RETURN NEW;
  END IF;

  SELECT
      "amount_minor",
      "currency",
      COALESCE("provider_amount_minor", "amount_minor"),
      COALESCE("provider_currency", "currency")
    INTO
      captured_amount,
      captured_currency,
      captured_provider_amount,
      captured_provider_currency
    FROM "payment_transactions"
   WHERE "id" = NEW."payment_transaction_id"
     AND "type" IN ('CHARGE', 'RENEWAL', 'PRORATION_CHARGE')
     AND "status" = 'CAPTURED'
   FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION USING
      ERRCODE = '23514',
      MESSAGE = 'refund target is not a captured charge';
  END IF;

  IF NEW."currency" <> captured_currency
     OR NEW."provider_currency" <> captured_provider_currency THEN
    RAISE EXCEPTION USING
      ERRCODE = '23514',
      MESSAGE = 'refund currency does not match captured transaction';
  END IF;

  SELECT
      COALESCE(SUM("amount_minor"), 0),
      COALESCE(SUM("provider_amount_minor"), 0)
    INTO reserved_amount, reserved_provider_amount
    FROM "refunds"
   WHERE "payment_transaction_id" = NEW."payment_transaction_id"
     AND status IN ('PENDING', 'SUCCEEDED')
     AND "id" <> NEW."id";

  IF reserved_amount + NEW."amount_minor" > captured_amount
     OR reserved_provider_amount + NEW."provider_amount_minor" > captured_provider_amount THEN
    RAISE EXCEPTION USING
      ERRCODE = '23514',
      MESSAGE = 'refund total exceeds captured transaction amount';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER "refunds_enforce_balance" ON "refunds";
CREATE TRIGGER "refunds_enforce_balance"
BEFORE INSERT OR UPDATE OF
  "payment_transaction_id",
  "status",
  "amount_minor",
  "currency",
  "provider_amount_minor",
  "provider_currency"
ON "refunds"
FOR EACH ROW
EXECUTE FUNCTION "enforce_refund_balance"();
