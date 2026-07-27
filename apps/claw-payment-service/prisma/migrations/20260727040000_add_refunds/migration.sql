CREATE TYPE "RefundStatus" AS ENUM ('PENDING', 'SUCCEEDED', 'FAILED');

CREATE TABLE "refunds" (
    "id" TEXT NOT NULL,
    "payment_transaction_id" TEXT NOT NULL,
    "subscription_id" TEXT NOT NULL,
    "invoice_id" TEXT,
    "user_id" TEXT NOT NULL,
    "requested_by_user_id" TEXT NOT NULL,
    "gateway" TEXT NOT NULL,
    "status" "RefundStatus" NOT NULL,
    "amount_minor" INTEGER NOT NULL,
    "currency" TEXT NOT NULL,
    "idempotency_key" TEXT NOT NULL,
    "provider_idempotency_key" TEXT NOT NULL,
    "provider_refund_id" TEXT,
    "reason" VARCHAR(500) NOT NULL,
    "failure_code" TEXT,
    "completed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "refunds_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "refunds_amount_positive_check" CHECK ("amount_minor" > 0),
    CONSTRAINT "refunds_currency_check" CHECK ("currency" ~ '^[A-Z]{3}$'),
    CONSTRAINT "refunds_succeeded_provider_check"
      CHECK ("status" <> 'SUCCEEDED' OR "provider_refund_id" IS NOT NULL)
);

CREATE UNIQUE INDEX "refunds_requested_by_user_id_idempotency_key_key"
  ON "refunds"("requested_by_user_id", "idempotency_key");
CREATE UNIQUE INDEX "refunds_gateway_provider_refund_id_key"
  ON "refunds"("gateway", "provider_refund_id");
CREATE INDEX "refunds_payment_transaction_id_idx" ON "refunds"("payment_transaction_id");
CREATE INDEX "refunds_subscription_id_idx" ON "refunds"("subscription_id");
CREATE INDEX "refunds_user_id_idx" ON "refunds"("user_id");
CREATE INDEX "refunds_status_idx" ON "refunds"("status");
CREATE INDEX "refunds_created_at_idx" ON "refunds"("created_at");

ALTER TABLE "refunds"
  ADD CONSTRAINT "refunds_payment_transaction_id_fkey"
  FOREIGN KEY ("payment_transaction_id") REFERENCES "payment_transactions"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "refunds"
  ADD CONSTRAINT "refunds_subscription_id_fkey"
  FOREIGN KEY ("subscription_id") REFERENCES "subscriptions"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "refunds"
  ADD CONSTRAINT "refunds_invoice_id_fkey"
  FOREIGN KEY ("invoice_id") REFERENCES "invoices"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE FUNCTION "enforce_refund_balance"()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  captured_amount INTEGER;
  captured_currency TEXT;
  reserved_amount BIGINT;
BEGIN
  IF NEW.status NOT IN ('PENDING', 'SUCCEEDED') THEN
    RETURN NEW;
  END IF;

  SELECT "amount_minor", "currency"
    INTO captured_amount, captured_currency
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

  IF NEW."currency" <> captured_currency THEN
    RAISE EXCEPTION USING
      ERRCODE = '23514',
      MESSAGE = 'refund currency does not match captured transaction';
  END IF;

  SELECT COALESCE(SUM("amount_minor"), 0)
    INTO reserved_amount
    FROM "refunds"
   WHERE "payment_transaction_id" = NEW."payment_transaction_id"
     AND status IN ('PENDING', 'SUCCEEDED')
     AND "id" <> NEW."id";

  IF reserved_amount + NEW."amount_minor" > captured_amount THEN
    RAISE EXCEPTION USING
      ERRCODE = '23514',
      MESSAGE = 'refund total exceeds captured transaction amount';
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER "refunds_enforce_balance"
BEFORE INSERT OR UPDATE OF "payment_transaction_id", "status", "amount_minor", "currency"
ON "refunds"
FOR EACH ROW
EXECUTE FUNCTION "enforce_refund_balance"();
