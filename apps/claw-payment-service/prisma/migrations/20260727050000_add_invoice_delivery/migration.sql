CREATE TYPE "InvoiceDeliveryStatus" AS ENUM ('PENDING', 'DELIVERED', 'FAILED');

ALTER TABLE "checkout_sessions"
  ADD COLUMN "billing_email" TEXT;

CREATE TABLE "invoice_deliveries" (
    "id" TEXT NOT NULL,
    "invoice_id" TEXT NOT NULL,
    "recipient_email" TEXT NOT NULL,
    "status" "InvoiceDeliveryStatus" NOT NULL DEFAULT 'PENDING',
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "available_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "delivered_at" TIMESTAMP(3),
    "last_error_code" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "invoice_deliveries_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "invoice_deliveries_attempts_nonnegative_check" CHECK ("attempts" >= 0)
);

CREATE UNIQUE INDEX "invoice_deliveries_invoice_id_key"
  ON "invoice_deliveries"("invoice_id");
CREATE INDEX "invoice_deliveries_status_available_at_idx"
  ON "invoice_deliveries"("status", "available_at");

ALTER TABLE "invoice_deliveries"
  ADD CONSTRAINT "invoice_deliveries_invoice_id_fkey"
  FOREIGN KEY ("invoice_id") REFERENCES "invoices"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

-- Issued invoice facts are immutable. Refunds are additive lifecycle facts, so
-- only status, amount_refunded_minor and updated_at may change after issuance.
CREATE FUNCTION "prevent_issued_invoice_mutation"()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    RAISE EXCEPTION USING
      ERRCODE = '23514',
      MESSAGE = 'issued invoices cannot be deleted';
  END IF;

  IF NEW."id" IS DISTINCT FROM OLD."id"
    OR NEW."number" IS DISTINCT FROM OLD."number"
    OR NEW."user_id" IS DISTINCT FROM OLD."user_id"
    OR NEW."subscription_id" IS DISTINCT FROM OLD."subscription_id"
    OR NEW."currency" IS DISTINCT FROM OLD."currency"
    OR NEW."subtotal_minor" IS DISTINCT FROM OLD."subtotal_minor"
    OR NEW."discount_minor" IS DISTINCT FROM OLD."discount_minor"
    OR NEW."tax_minor" IS DISTINCT FROM OLD."tax_minor"
    OR NEW."total_minor" IS DISTINCT FROM OLD."total_minor"
    OR NEW."amount_paid_minor" IS DISTINCT FROM OLD."amount_paid_minor"
    OR NEW."period_start" IS DISTINCT FROM OLD."period_start"
    OR NEW."period_end" IS DISTINCT FROM OLD."period_end"
    OR NEW."issued_at" IS DISTINCT FROM OLD."issued_at"
    OR NEW."paid_at" IS DISTINCT FROM OLD."paid_at"
    OR NEW."created_at" IS DISTINCT FROM OLD."created_at"
  THEN
    RAISE EXCEPTION USING
      ERRCODE = '23514',
      MESSAGE = 'issued invoice facts are immutable';
  END IF;

  IF NEW."amount_refunded_minor" < OLD."amount_refunded_minor"
    OR NEW."amount_refunded_minor" > OLD."total_minor"
  THEN
    RAISE EXCEPTION USING
      ERRCODE = '23514',
      MESSAGE = 'invoice refund totals must be monotonic and bounded';
  END IF;

  IF NEW."amount_refunded_minor" = OLD."amount_refunded_minor"
    AND NEW."status" IS DISTINCT FROM OLD."status"
  THEN
    RAISE EXCEPTION USING
      ERRCODE = '23514',
      MESSAGE = 'invoice status cannot change without a refund';
  END IF;

  IF NEW."amount_refunded_minor" > OLD."amount_refunded_minor"
    AND NEW."status" IS DISTINCT FROM (
      CASE
        WHEN NEW."amount_refunded_minor" = OLD."total_minor" THEN 'REFUNDED'
        ELSE 'PARTIALLY_REFUNDED'
      END
    )
  THEN
    RAISE EXCEPTION USING
      ERRCODE = '23514',
      MESSAGE = 'invoice refund status does not match its refunded total';
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER "invoices_prevent_issued_update"
BEFORE UPDATE ON "invoices"
FOR EACH ROW
EXECUTE FUNCTION "prevent_issued_invoice_mutation"();

CREATE TRIGGER "invoices_prevent_issued_delete"
BEFORE DELETE ON "invoices"
FOR EACH ROW
EXECUTE FUNCTION "prevent_issued_invoice_mutation"();

CREATE FUNCTION "prevent_invoice_line_mutation"()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  RAISE EXCEPTION USING
    ERRCODE = '23514',
    MESSAGE = 'issued invoice lines are immutable';
END;
$$;

CREATE TRIGGER "invoice_lines_prevent_mutation"
BEFORE UPDATE OR DELETE ON "invoice_lines"
FOR EACH ROW
EXECUTE FUNCTION "prevent_invoice_line_mutation"();
