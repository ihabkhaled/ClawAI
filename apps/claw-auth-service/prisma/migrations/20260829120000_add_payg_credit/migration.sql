-- Pay-as-you-go connector credit: the wallet, its append-only ledger, and the
-- immutable top-up package catalog.
--
-- PURELY ADDITIVE, and that is the rollback plan. Every new column on an
-- existing table has a DEFAULT, and every new table is unreferenced by existing
-- code, so the previous release runs unchanged against this schema. Rolling
-- back means redeploying the old image, not reversing this file — reversing it
-- would drop a ledger that may already record money a customer paid.
--
-- Money is integer micro-USD in BIGINT columns throughout. NUMERIC would be
-- correct too but invites a float somewhere in the driver; BIGINT cannot be
-- rounded by accident.

-- ─────────────────────────────────────────────────────────────────────────────
-- Enums. Members mirror `CreditBucket` / `CreditLedgerKind` in
-- @claw/shared-types exactly; the wire payload and the column must never
-- disagree about what a value means.
-- ─────────────────────────────────────────────────────────────────────────────

-- CreateEnum
CREATE TYPE "CreditBucket" AS ENUM ('GRANT', 'PURCHASED');

-- CreateEnum
CREATE TYPE "CreditLedgerKind" AS ENUM (
    'PLAN_GRANT',
    'GRANT_EXPIRY',
    'TOPUP',
    'TOPUP_REVERSAL',
    'RESERVATION',
    'RESERVATION_RELEASE',
    'CONSUMPTION',
    'ADMIN_ADJUSTMENT',
    'PROVIDER_FAILURE_REFUND'
);

-- ─────────────────────────────────────────────────────────────────────────────
-- PAYG attribution on the existing per-execution reservation row.
--
-- There is no separate reservation table: `weighted_usage_records` already
-- carries reservation id, request id, provider, model, workflow and a
-- RESERVED/FINALIZED/RELEASED state machine. A second table holding the same
-- lifecycle is how the two start disagreeing about whether a hold is open.
--
-- Defaults make every historical row valid and let the previous release keep
-- inserting rows that simply say "not PAYG".
-- ─────────────────────────────────────────────────────────────────────────────

-- AlterTable
ALTER TABLE "weighted_usage_records" ADD COLUMN "is_payg" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "weighted_usage_records" ADD COLUMN "credit_grant_micro_usd" BIGINT NOT NULL DEFAULT 0;
ALTER TABLE "weighted_usage_records" ADD COLUMN "credit_purchased_micro_usd" BIGINT NOT NULL DEFAULT 0;

-- ─────────────────────────────────────────────────────────────────────────────
-- The wallet.
--
-- Balances are GROSS of outstanding holds; `available` is
-- grant + purchased - reserved, floored at zero. Deliberately NO version column:
-- Redis+Lua is the concurrency authority and Postgres the durability authority,
-- and a second optimistic lock over the same value is how the two drift.
-- ─────────────────────────────────────────────────────────────────────────────

-- CreateTable
CREATE TABLE "user_credit_wallets" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "grant_micro_usd" BIGINT NOT NULL DEFAULT 0,
    "purchased_micro_usd" BIGINT NOT NULL DEFAULT 0,
    "reserved_micro_usd" BIGINT NOT NULL DEFAULT 0,
    "period_grant_micro_usd" BIGINT NOT NULL DEFAULT 0,
    "period_key" TEXT NOT NULL,
    "grant_resets_at" TIMESTAMP(3) NOT NULL,
    "lifetime_granted_micro_usd" BIGINT NOT NULL DEFAULT 0,
    "lifetime_purchased_micro_usd" BIGINT NOT NULL DEFAULT 0,
    "lifetime_consumed_micro_usd" BIGINT NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_credit_wallets_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "user_credit_wallets_user_id_key" ON "user_credit_wallets"("user_id");

-- CreateIndex
CREATE INDEX "user_credit_wallets_period_key_idx" ON "user_credit_wallets"("period_key");

-- ─────────────────────────────────────────────────────────────────────────────
-- The append-only ledger the wallet must reconcile to.
--
--   grant_micro_usd     == SUM(grant_delta_micro_usd)
--   purchased_micro_usd == SUM(purchased_delta_micro_usd)
--   available           == SUM(amount_micro_usd)
--
-- `source_event_id` is UNIQUE so a redelivered top-up event is rejected by the
-- database, not by an application check two consumers can race.
-- ─────────────────────────────────────────────────────────────────────────────

-- CreateTable
CREATE TABLE "credit_ledger_entries" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "wallet_id" TEXT NOT NULL,
    "kind" "CreditLedgerKind" NOT NULL,
    "amount_micro_usd" BIGINT NOT NULL,
    "grant_delta_micro_usd" BIGINT NOT NULL DEFAULT 0,
    "purchased_delta_micro_usd" BIGINT NOT NULL DEFAULT 0,
    "balance_after_micro_usd" BIGINT NOT NULL,
    "reservation_id" TEXT,
    "request_id" TEXT,
    "provider" TEXT,
    "model" TEXT,
    "surface" TEXT,
    "workflow" TEXT,
    "source_event_id" TEXT,
    "actor_user_id" TEXT,
    "reason" TEXT,
    "occurred_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "credit_ledger_entries_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "credit_ledger_entries_source_event_id_key" ON "credit_ledger_entries"("source_event_id");

-- CreateIndex
CREATE INDEX "credit_ledger_entries_user_id_occurred_at_idx" ON "credit_ledger_entries"("user_id", "occurred_at");

-- CreateIndex
CREATE INDEX "credit_ledger_entries_reservation_id_idx" ON "credit_ledger_entries"("reservation_id");

-- AddForeignKey
ALTER TABLE "credit_ledger_entries" ADD CONSTRAINT "credit_ledger_entries_wallet_id_fkey" FOREIGN KEY ("wallet_id") REFERENCES "user_credit_wallets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ─────────────────────────────────────────────────────────────────────────────
-- Top-up catalog. The package carries no money; every price is an immutable
-- version row, following `plan_price_versions` exactly — including the
-- `active_key` partial-unique idiom, which lets any number of retired versions
-- coexist while the database itself refuses a second ACTIVE price.
-- ─────────────────────────────────────────────────────────────────────────────

-- CreateTable
CREATE TABLE "credit_packages" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "display_order" INTEGER NOT NULL DEFAULT 0,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "credit_packages_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "credit_packages_slug_key" ON "credit_packages"("slug");

-- CreateIndex
CREATE INDEX "credit_packages_is_active_idx" ON "credit_packages"("is_active");

-- CreateIndex
CREATE INDEX "credit_packages_display_order_idx" ON "credit_packages"("display_order");

-- CreateTable
CREATE TABLE "credit_package_versions" (
    "id" TEXT NOT NULL,
    "package_id" TEXT NOT NULL,
    "price_minor" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "credit_micro_usd" BIGINT NOT NULL,
    "version" INTEGER NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "active_key" TEXT,
    "effective_from" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "retired_at" TIMESTAMP(3),
    "created_by_user_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "credit_package_versions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "credit_package_versions_active_key_key" ON "credit_package_versions"("active_key");

-- CreateIndex
CREATE INDEX "credit_package_versions_package_id_idx" ON "credit_package_versions"("package_id");

-- CreateIndex
CREATE INDEX "credit_package_versions_is_active_idx" ON "credit_package_versions"("is_active");

-- CreateIndex
CREATE UNIQUE INDEX "credit_package_versions_package_id_version_key" ON "credit_package_versions"("package_id", "version");

-- AddForeignKey
ALTER TABLE "credit_package_versions" ADD CONSTRAINT "credit_package_versions_package_id_fkey" FOREIGN KEY ("package_id") REFERENCES "credit_packages"("id") ON DELETE CASCADE ON UPDATE CASCADE;
