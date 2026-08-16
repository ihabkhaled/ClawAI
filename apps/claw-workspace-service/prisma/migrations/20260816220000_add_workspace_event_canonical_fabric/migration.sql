-- Workspace Automation Phase 03 — Canonical Event Fabric.
-- Normalized, deduped, replayable representation of "something happened",
-- mapped from raw WebhookDelivery rows. See schema.prisma for field notes.
CREATE TYPE "WorkspaceEventProcessingStatus" AS ENUM ('PENDING', 'PROCESSED', 'FAILED');

CREATE TABLE "workspace_events" (
  "id"                   TEXT NOT NULL,
  "schema_version"       INTEGER NOT NULL DEFAULT 1,
  "connector_id"         TEXT,
  "provider"             "WorkspaceProvider" NOT NULL,
  "event_type"           VARCHAR(64) NOT NULL,
  "resource_type"        "WorkspaceObjectType",
  "resource_external_id" VARCHAR(256),
  "occurred_at"          TIMESTAMP(3),
  "received_at"          TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "correlation_id"       TEXT NOT NULL,
  "idempotency_key"      VARCHAR(320) NOT NULL,
  "payload"              JSONB NOT NULL,
  "payload_hash"         VARCHAR(64) NOT NULL,
  "source_delivery_id"   TEXT,
  "processing_status"    "WorkspaceEventProcessingStatus" NOT NULL DEFAULT 'PENDING',
  "processing_error"     VARCHAR(2000),
  "created_at"           TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "workspace_events_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "workspace_events_provider_idempotency_key_key" ON "workspace_events"("provider", "idempotency_key");
CREATE INDEX "workspace_events_provider_event_type_received_at_idx" ON "workspace_events"("provider", "event_type", "received_at");
CREATE INDEX "workspace_events_connector_id_idx" ON "workspace_events"("connector_id");
CREATE INDEX "workspace_events_processing_status_idx" ON "workspace_events"("processing_status");
CREATE INDEX "workspace_events_source_delivery_id_idx" ON "workspace_events"("source_delivery_id");
