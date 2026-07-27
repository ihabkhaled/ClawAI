-- Durable, privacy-minimal ledger for billing reconciliation runs and findings.
ALTER TABLE "subscriptions"
    ADD COLUMN "scheduled_amount_minor" INTEGER,
    ADD COLUMN "scheduled_billing_interval" TEXT;

CREATE TABLE "reconciliation_runs" (
    "id" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "scanned_count" INTEGER NOT NULL DEFAULT 0,
    "repaired_count" INTEGER NOT NULL DEFAULT 0,
    "quarantined_count" INTEGER NOT NULL DEFAULT 0,
    "unprocessed_count" INTEGER NOT NULL DEFAULT 0,
    "started_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completed_at" TIMESTAMP(3),
    "error_code" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "reconciliation_runs_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "reconciliation_divergences" (
    "id" TEXT NOT NULL,
    "run_id" TEXT NOT NULL,
    "entity_type" TEXT NOT NULL,
    "entity_id" TEXT NOT NULL,
    "gateway" TEXT NOT NULL,
    "classification" TEXT NOT NULL,
    "local_status" TEXT NOT NULL,
    "provider_status" TEXT,
    "resolution" TEXT NOT NULL,
    "repaired_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "reconciliation_divergences_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "reconciliation_runs_status_idx" ON "reconciliation_runs"("status");
CREATE INDEX "reconciliation_runs_started_at_idx" ON "reconciliation_runs"("started_at");
CREATE INDEX "reconciliation_divergences_entity_type_entity_id_idx"
    ON "reconciliation_divergences"("entity_type", "entity_id");
CREATE INDEX "reconciliation_divergences_classification_idx"
    ON "reconciliation_divergences"("classification");
CREATE INDEX "reconciliation_divergences_resolution_idx"
    ON "reconciliation_divergences"("resolution");
CREATE UNIQUE INDEX "reconciliation_divergences_run_id_entity_type_entity_id_classification_key"
    ON "reconciliation_divergences"("run_id", "entity_type", "entity_id", "classification");

ALTER TABLE "reconciliation_divergences"
    ADD CONSTRAINT "reconciliation_divergences_run_id_fkey"
    FOREIGN KEY ("run_id") REFERENCES "reconciliation_runs"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
