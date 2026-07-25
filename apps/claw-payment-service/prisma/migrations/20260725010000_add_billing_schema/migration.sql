-- CreateTable
CREATE TABLE "billing_customers" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "gateway" TEXT NOT NULL,
    "encrypted_gateway_customer_id" TEXT,
    "encryption_key_version" INTEGER NOT NULL DEFAULT 1,
    "billing_email" TEXT,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "billing_customers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "subscriptions" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "billing_customer_id" TEXT NOT NULL,
    "plan_id" TEXT NOT NULL,
    "plan_slug" TEXT NOT NULL,
    "plan_price_version_id" TEXT NOT NULL,
    "gateway" TEXT NOT NULL,
    "encrypted_gateway_subscription_id" TEXT,
    "encryption_key_version" INTEGER NOT NULL DEFAULT 1,
    "gateway_subscription_lookup_hash" TEXT,
    "status" TEXT NOT NULL,
    "billing_interval" TEXT NOT NULL,
    "currency" TEXT NOT NULL,
    "amount_minor" INTEGER NOT NULL,
    "current_period_start" TIMESTAMP(3) NOT NULL,
    "current_period_end" TIMESTAMP(3) NOT NULL,
    "cancel_at_period_end" BOOLEAN NOT NULL DEFAULT false,
    "cancelled_at" TIMESTAMP(3),
    "past_due_at" TIMESTAMP(3),
    "grace_period_ends_at" TIMESTAMP(3),
    "entitlement_valid_until" TIMESTAMP(3) NOT NULL,
    "scheduled_plan_id" TEXT,
    "scheduled_plan_slug" TEXT,
    "scheduled_plan_price_version_id" TEXT,
    "scheduled_effective_at" TIMESTAMP(3),
    "version" INTEGER NOT NULL DEFAULT 0,
    "unique_active_key" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "subscriptions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "checkout_sessions" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "purpose" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "gateway" TEXT NOT NULL,
    "plan_id" TEXT NOT NULL,
    "plan_slug" TEXT NOT NULL,
    "plan_price_version_id" TEXT NOT NULL,
    "billing_interval" TEXT NOT NULL,
    "base_amount_minor" INTEGER NOT NULL,
    "base_currency" TEXT NOT NULL,
    "charge_amount_minor" INTEGER NOT NULL,
    "charge_currency" TEXT NOT NULL,
    "fx_quote_id" TEXT,
    "fx_final_rate_scaled" BIGINT,
    "idempotency_key" TEXT NOT NULL,
    "state_nonce" TEXT NOT NULL,
    "provider_order_id" TEXT,
    "hosted_checkout_url" TEXT,
    "subscription_id" TEXT,
    "proration_quote_id" TEXT,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "verified_at" TIMESTAMP(3),
    "completed_at" TIMESTAMP(3),
    "failure_code" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "checkout_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payment_transactions" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "subscription_id" TEXT,
    "checkout_session_id" TEXT,
    "gateway" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "amount_minor" INTEGER NOT NULL,
    "currency" TEXT NOT NULL,
    "provider_amount_minor" INTEGER,
    "provider_currency" TEXT,
    "provider_transaction_id" TEXT,
    "provider_order_id" TEXT,
    "idempotency_key" TEXT NOT NULL,
    "price_snapshot_json" JSONB,
    "fx_snapshot_json" JSONB,
    "failure_code" TEXT,
    "captured_at" TIMESTAMP(3),
    "refunded_at" TIMESTAMP(3),
    "reverses_transaction_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "payment_transactions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "invoices" (
    "id" TEXT NOT NULL,
    "number" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "subscription_id" TEXT,
    "status" TEXT NOT NULL,
    "currency" TEXT NOT NULL,
    "subtotal_minor" INTEGER NOT NULL,
    "discount_minor" INTEGER NOT NULL DEFAULT 0,
    "tax_minor" INTEGER NOT NULL DEFAULT 0,
    "total_minor" INTEGER NOT NULL,
    "amount_paid_minor" INTEGER NOT NULL DEFAULT 0,
    "amount_refunded_minor" INTEGER NOT NULL DEFAULT 0,
    "period_start" TIMESTAMP(3),
    "period_end" TIMESTAMP(3),
    "issued_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "paid_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "invoices_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "invoice_lines" (
    "id" TEXT NOT NULL,
    "invoice_id" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "amount_minor" INTEGER NOT NULL,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "invoice_lines_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "proration_quotes" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "subscription_id" TEXT NOT NULL,
    "current_plan_id" TEXT NOT NULL,
    "current_plan_slug" TEXT NOT NULL,
    "current_plan_price_version_id" TEXT NOT NULL,
    "current_amount_minor" INTEGER NOT NULL,
    "target_plan_id" TEXT NOT NULL,
    "target_plan_slug" TEXT NOT NULL,
    "target_plan_price_version_id" TEXT NOT NULL,
    "target_amount_minor" INTEGER NOT NULL,
    "target_billing_interval" TEXT NOT NULL,
    "currency" TEXT NOT NULL,
    "effective_at" TIMESTAMP(3) NOT NULL,
    "remaining_ratio_scaled" INTEGER NOT NULL,
    "unused_current_credit_minor" INTEGER NOT NULL,
    "target_remaining_charge_minor" INTEGER NOT NULL,
    "amount_due_minor" INTEGER NOT NULL,
    "is_scheduled_for_period_end" BOOLEAN NOT NULL DEFAULT false,
    "scheduled_effective_at" TIMESTAMP(3),
    "status" TEXT NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "consumed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "proration_quotes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payment_methods" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "billing_customer_id" TEXT NOT NULL,
    "gateway" TEXT NOT NULL,
    "encrypted_token" TEXT NOT NULL,
    "encryption_key_version" INTEGER NOT NULL DEFAULT 1,
    "token_blind_index" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "brand" VARCHAR(32),
    "last4" VARCHAR(4),
    "expiry_month" INTEGER,
    "expiry_year" INTEGER,
    "status" TEXT NOT NULL,
    "is_default" BOOLEAN NOT NULL DEFAULT false,
    "consented_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "payment_methods_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "webhook_events" (
    "id" TEXT NOT NULL,
    "gateway" TEXT NOT NULL,
    "provider_event_id" TEXT NOT NULL,
    "event_type" TEXT NOT NULL,
    "payload_hash" TEXT NOT NULL,
    "signature_valid" BOOLEAN NOT NULL,
    "status" TEXT NOT NULL,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "received_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "processed_at" TIMESTAMP(3),
    "error_code" TEXT,
    "related_subscription_id" TEXT,
    "related_transaction_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "webhook_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "idempotency_records" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "operation" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "request_hash" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "response_json" JSONB,
    "response_status_code" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "idempotency_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "outbox_events" (
    "id" TEXT NOT NULL,
    "pattern" TEXT NOT NULL,
    "event_id" TEXT NOT NULL,
    "aggregate_type" TEXT NOT NULL,
    "aggregate_id" TEXT NOT NULL,
    "payload_json" JSONB NOT NULL,
    "status" TEXT NOT NULL,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "last_error_code" TEXT,
    "available_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "published_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "outbox_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "inbox_events" (
    "id" TEXT NOT NULL,
    "event_id" TEXT NOT NULL,
    "pattern" TEXT NOT NULL,
    "producer" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "error_code" TEXT,
    "received_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "processed_at" TIMESTAMP(3),

    CONSTRAINT "inbox_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "fx_quotes" (
    "id" TEXT NOT NULL,
    "base_currency" TEXT NOT NULL,
    "quote_currency" TEXT NOT NULL,
    "source_rate_scaled" BIGINT NOT NULL,
    "safety_margin_bps" INTEGER NOT NULL,
    "final_rate_scaled" BIGINT NOT NULL,
    "source" TEXT NOT NULL,
    "fetched_at" TIMESTAMP(3) NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "fx_quotes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "gateway_plan_mappings" (
    "id" TEXT NOT NULL,
    "gateway" TEXT NOT NULL,
    "plan_id" TEXT NOT NULL,
    "plan_slug" TEXT NOT NULL,
    "plan_price_version_id" TEXT NOT NULL,
    "gateway_product_id" TEXT NOT NULL,
    "gateway_plan_id" TEXT NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "gateway_plan_mappings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "billing_customers_user_id_idx" ON "billing_customers"("user_id");

-- CreateIndex
CREATE INDEX "billing_customers_status_idx" ON "billing_customers"("status");

-- CreateIndex
CREATE UNIQUE INDEX "billing_customers_user_id_gateway_key" ON "billing_customers"("user_id", "gateway");

-- CreateIndex
CREATE INDEX "subscriptions_user_id_idx" ON "subscriptions"("user_id");

-- CreateIndex
CREATE INDEX "subscriptions_status_idx" ON "subscriptions"("status");

-- CreateIndex
CREATE INDEX "subscriptions_current_period_end_idx" ON "subscriptions"("current_period_end");

-- CreateIndex
CREATE INDEX "subscriptions_grace_period_ends_at_idx" ON "subscriptions"("grace_period_ends_at");

-- CreateIndex
CREATE INDEX "subscriptions_scheduled_effective_at_idx" ON "subscriptions"("scheduled_effective_at");

-- CreateIndex
CREATE UNIQUE INDEX "subscriptions_unique_active_key_key" ON "subscriptions"("unique_active_key");

-- CreateIndex
CREATE UNIQUE INDEX "subscriptions_gateway_gateway_subscription_lookup_hash_key" ON "subscriptions"("gateway", "gateway_subscription_lookup_hash");

-- CreateIndex
CREATE INDEX "checkout_sessions_user_id_idx" ON "checkout_sessions"("user_id");

-- CreateIndex
CREATE INDEX "checkout_sessions_status_idx" ON "checkout_sessions"("status");

-- CreateIndex
CREATE INDEX "checkout_sessions_expires_at_idx" ON "checkout_sessions"("expires_at");

-- CreateIndex
CREATE UNIQUE INDEX "checkout_sessions_user_id_idempotency_key_key" ON "checkout_sessions"("user_id", "idempotency_key");

-- CreateIndex
CREATE UNIQUE INDEX "checkout_sessions_gateway_provider_order_id_key" ON "checkout_sessions"("gateway", "provider_order_id");

-- CreateIndex
CREATE INDEX "payment_transactions_subscription_id_idx" ON "payment_transactions"("subscription_id");

-- CreateIndex
CREATE INDEX "payment_transactions_status_idx" ON "payment_transactions"("status");

-- CreateIndex
CREATE INDEX "payment_transactions_type_idx" ON "payment_transactions"("type");

-- CreateIndex
CREATE INDEX "payment_transactions_created_at_idx" ON "payment_transactions"("created_at");

-- CreateIndex
CREATE UNIQUE INDEX "payment_transactions_gateway_provider_transaction_id_key" ON "payment_transactions"("gateway", "provider_transaction_id");

-- CreateIndex
CREATE UNIQUE INDEX "payment_transactions_user_id_idempotency_key_key" ON "payment_transactions"("user_id", "idempotency_key");

-- CreateIndex
CREATE UNIQUE INDEX "invoices_number_key" ON "invoices"("number");

-- CreateIndex
CREATE INDEX "invoices_user_id_idx" ON "invoices"("user_id");

-- CreateIndex
CREATE INDEX "invoices_subscription_id_idx" ON "invoices"("subscription_id");

-- CreateIndex
CREATE INDEX "invoices_status_idx" ON "invoices"("status");

-- CreateIndex
CREATE INDEX "invoices_issued_at_idx" ON "invoices"("issued_at");

-- CreateIndex
CREATE INDEX "invoice_lines_invoice_id_idx" ON "invoice_lines"("invoice_id");

-- CreateIndex
CREATE INDEX "proration_quotes_user_id_idx" ON "proration_quotes"("user_id");

-- CreateIndex
CREATE INDEX "proration_quotes_subscription_id_idx" ON "proration_quotes"("subscription_id");

-- CreateIndex
CREATE INDEX "proration_quotes_status_idx" ON "proration_quotes"("status");

-- CreateIndex
CREATE INDEX "proration_quotes_expires_at_idx" ON "proration_quotes"("expires_at");

-- CreateIndex
CREATE INDEX "payment_methods_user_id_idx" ON "payment_methods"("user_id");

-- CreateIndex
CREATE INDEX "payment_methods_status_idx" ON "payment_methods"("status");

-- CreateIndex
CREATE UNIQUE INDEX "payment_methods_user_id_gateway_token_blind_index_key" ON "payment_methods"("user_id", "gateway", "token_blind_index");

-- CreateIndex
CREATE INDEX "webhook_events_status_idx" ON "webhook_events"("status");

-- CreateIndex
CREATE INDEX "webhook_events_received_at_idx" ON "webhook_events"("received_at");

-- CreateIndex
CREATE INDEX "webhook_events_event_type_idx" ON "webhook_events"("event_type");

-- CreateIndex
CREATE UNIQUE INDEX "webhook_events_gateway_provider_event_id_key" ON "webhook_events"("gateway", "provider_event_id");

-- CreateIndex
CREATE INDEX "idempotency_records_expires_at_idx" ON "idempotency_records"("expires_at");

-- CreateIndex
CREATE UNIQUE INDEX "idempotency_records_user_id_operation_key_key" ON "idempotency_records"("user_id", "operation", "key");

-- CreateIndex
CREATE UNIQUE INDEX "outbox_events_event_id_key" ON "outbox_events"("event_id");

-- CreateIndex
CREATE INDEX "outbox_events_status_available_at_idx" ON "outbox_events"("status", "available_at");

-- CreateIndex
CREATE INDEX "outbox_events_aggregate_type_aggregate_id_idx" ON "outbox_events"("aggregate_type", "aggregate_id");

-- CreateIndex
CREATE UNIQUE INDEX "inbox_events_event_id_key" ON "inbox_events"("event_id");

-- CreateIndex
CREATE INDEX "inbox_events_status_idx" ON "inbox_events"("status");

-- CreateIndex
CREATE INDEX "inbox_events_received_at_idx" ON "inbox_events"("received_at");

-- CreateIndex
CREATE INDEX "fx_quotes_base_currency_quote_currency_expires_at_idx" ON "fx_quotes"("base_currency", "quote_currency", "expires_at");

-- CreateIndex
CREATE INDEX "gateway_plan_mappings_plan_id_idx" ON "gateway_plan_mappings"("plan_id");

-- CreateIndex
CREATE UNIQUE INDEX "gateway_plan_mappings_gateway_plan_price_version_id_key" ON "gateway_plan_mappings"("gateway", "plan_price_version_id");

-- CreateIndex
CREATE UNIQUE INDEX "gateway_plan_mappings_gateway_gateway_plan_id_key" ON "gateway_plan_mappings"("gateway", "gateway_plan_id");

-- AddForeignKey
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_billing_customer_id_fkey" FOREIGN KEY ("billing_customer_id") REFERENCES "billing_customers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "checkout_sessions" ADD CONSTRAINT "checkout_sessions_subscription_id_fkey" FOREIGN KEY ("subscription_id") REFERENCES "subscriptions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payment_transactions" ADD CONSTRAINT "payment_transactions_subscription_id_fkey" FOREIGN KEY ("subscription_id") REFERENCES "subscriptions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payment_transactions" ADD CONSTRAINT "payment_transactions_checkout_session_id_fkey" FOREIGN KEY ("checkout_session_id") REFERENCES "checkout_sessions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_subscription_id_fkey" FOREIGN KEY ("subscription_id") REFERENCES "subscriptions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoice_lines" ADD CONSTRAINT "invoice_lines_invoice_id_fkey" FOREIGN KEY ("invoice_id") REFERENCES "invoices"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "proration_quotes" ADD CONSTRAINT "proration_quotes_subscription_id_fkey" FOREIGN KEY ("subscription_id") REFERENCES "subscriptions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payment_methods" ADD CONSTRAINT "payment_methods_billing_customer_id_fkey" FOREIGN KEY ("billing_customer_id") REFERENCES "billing_customers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
