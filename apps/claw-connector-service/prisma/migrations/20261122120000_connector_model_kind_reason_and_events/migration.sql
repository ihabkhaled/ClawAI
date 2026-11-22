-- Model visibility trail (2026-11-22). Additive only: one nullable column and
-- one new table, so existing rows and readers are unaffected.
--
-- kind_reason: why a sync classified a model as non-CHAT ("Google lists only:
-- createDecision"). connector_model_events: what a sync changed on a model
-- (kind flip, unexpose) with before/after, so an admin can see when and why a
-- model left the chat picker.
ALTER TABLE "connector_models" ADD COLUMN IF NOT EXISTS "kind_reason" TEXT;

DO $$ BEGIN
  CREATE TYPE "ConnectorModelEventType" AS ENUM ('KIND_CHANGED', 'UNEXPOSED_BY_SYNC');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS "connector_model_events" (
  "id" TEXT NOT NULL,
  "connector_id" TEXT NOT NULL,
  "model_key" TEXT NOT NULL,
  "type" "ConnectorModelEventType" NOT NULL,
  "before_kind" "ModelKind",
  "after_kind" "ModelKind",
  "before_exposure" "ModelExposure",
  "after_exposure" "ModelExposure",
  "reason" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "connector_model_events_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "connector_model_events_connector_id_model_key_created_at_idx"
  ON "connector_model_events" ("connector_id", "model_key", "created_at");

DO $$ BEGIN
  ALTER TABLE "connector_model_events"
    ADD CONSTRAINT "connector_model_events_connector_id_fkey"
    FOREIGN KEY ("connector_id") REFERENCES "connectors"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
