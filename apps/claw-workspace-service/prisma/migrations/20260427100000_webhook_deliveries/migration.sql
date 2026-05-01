-- Stream 11: Universal Webhook Receiver
-- Stores every inbound webhook delivery for replay + audit; signature-valid flag
-- captures whether HMAC verification succeeded.

CREATE TABLE "webhook_deliveries" (
  "id" TEXT NOT NULL,
  "connector_id" TEXT,
  "provider" "WorkspaceProvider" NOT NULL,
  "external_delivery_id" VARCHAR(256),
  "event_type" VARCHAR(128),
  "signature_valid" BOOLEAN NOT NULL DEFAULT false,
  "signature" VARCHAR(512),
  "raw_payload" JSONB NOT NULL,
  "processed_at" TIMESTAMP(3),
  "error_message" VARCHAR(2000),
  "ip_address" VARCHAR(64),
  "body_bytes" INTEGER NOT NULL DEFAULT 0,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "webhook_deliveries_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "webhook_deliveries_provider_external_delivery_id_key"
  ON "webhook_deliveries"("provider", "external_delivery_id");

CREATE INDEX "webhook_deliveries_provider_created_at_idx"
  ON "webhook_deliveries"("provider", "created_at");

CREATE INDEX "webhook_deliveries_signature_valid_created_at_idx"
  ON "webhook_deliveries"("signature_valid", "created_at");

CREATE INDEX "webhook_deliveries_connector_id_idx"
  ON "webhook_deliveries"("connector_id");
