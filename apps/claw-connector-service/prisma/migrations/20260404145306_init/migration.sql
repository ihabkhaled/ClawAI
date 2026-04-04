-- CreateEnum
CREATE TYPE "ConnectorProvider" AS ENUM ('OPENAI', 'ANTHROPIC', 'GEMINI', 'AWS_BEDROCK', 'DEEPSEEK', 'OLLAMA');

-- CreateEnum
CREATE TYPE "ConnectorStatus" AS ENUM ('HEALTHY', 'DEGRADED', 'DOWN', 'UNKNOWN');

-- CreateEnum
CREATE TYPE "ConnectorAuthType" AS ENUM ('API_KEY', 'OAUTH2', 'NONE');

-- CreateEnum
CREATE TYPE "ModelLifecycle" AS ENUM ('ACTIVE', 'DEPRECATED', 'SUNSET');

-- CreateEnum
CREATE TYPE "ModelSyncStatus" AS ENUM ('RUNNING', 'COMPLETED', 'FAILED');

-- CreateTable
CREATE TABLE "connectors" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "provider" "ConnectorProvider" NOT NULL,
    "status" "ConnectorStatus" NOT NULL DEFAULT 'UNKNOWN',
    "auth_type" "ConnectorAuthType" NOT NULL,
    "encrypted_config" TEXT,
    "is_enabled" BOOLEAN NOT NULL DEFAULT true,
    "default_model_id" TEXT,
    "base_url" TEXT,
    "region" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "connectors_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "connector_models" (
    "id" TEXT NOT NULL,
    "connector_id" TEXT NOT NULL,
    "provider" "ConnectorProvider" NOT NULL,
    "model_key" TEXT NOT NULL,
    "display_name" TEXT NOT NULL,
    "lifecycle" "ModelLifecycle" NOT NULL DEFAULT 'ACTIVE',
    "supports_streaming" BOOLEAN NOT NULL DEFAULT false,
    "supports_tools" BOOLEAN NOT NULL DEFAULT false,
    "supports_vision" BOOLEAN NOT NULL DEFAULT false,
    "supports_audio" BOOLEAN NOT NULL DEFAULT false,
    "supports_structured_output" BOOLEAN NOT NULL DEFAULT false,
    "max_context_tokens" INTEGER,
    "synced_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "connector_models_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "connector_health_events" (
    "id" TEXT NOT NULL,
    "connector_id" TEXT NOT NULL,
    "status" "ConnectorStatus" NOT NULL,
    "latency_ms" INTEGER,
    "error_message" TEXT,
    "checked_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "connector_health_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "model_sync_runs" (
    "id" TEXT NOT NULL,
    "connector_id" TEXT NOT NULL,
    "status" "ModelSyncStatus" NOT NULL,
    "models_found" INTEGER NOT NULL DEFAULT 0,
    "models_added" INTEGER NOT NULL DEFAULT 0,
    "models_removed" INTEGER NOT NULL DEFAULT 0,
    "started_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completed_at" TIMESTAMP(3),
    "error_message" TEXT,

    CONSTRAINT "model_sync_runs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "connectors_provider_idx" ON "connectors"("provider");

-- CreateIndex
CREATE INDEX "connectors_status_idx" ON "connectors"("status");

-- CreateIndex
CREATE INDEX "connectors_is_enabled_idx" ON "connectors"("is_enabled");

-- CreateIndex
CREATE INDEX "connector_models_connector_id_idx" ON "connector_models"("connector_id");

-- CreateIndex
CREATE INDEX "connector_models_provider_idx" ON "connector_models"("provider");

-- CreateIndex
CREATE INDEX "connector_models_lifecycle_idx" ON "connector_models"("lifecycle");

-- CreateIndex
CREATE UNIQUE INDEX "connector_models_connector_id_model_key_key" ON "connector_models"("connector_id", "model_key");

-- CreateIndex
CREATE INDEX "connector_health_events_connector_id_idx" ON "connector_health_events"("connector_id");

-- CreateIndex
CREATE INDEX "connector_health_events_checked_at_idx" ON "connector_health_events"("checked_at");

-- CreateIndex
CREATE INDEX "model_sync_runs_connector_id_idx" ON "model_sync_runs"("connector_id");

-- CreateIndex
CREATE INDEX "model_sync_runs_status_idx" ON "model_sync_runs"("status");

-- AddForeignKey
ALTER TABLE "connector_models" ADD CONSTRAINT "connector_models_connector_id_fkey" FOREIGN KEY ("connector_id") REFERENCES "connectors"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "connector_health_events" ADD CONSTRAINT "connector_health_events_connector_id_fkey" FOREIGN KEY ("connector_id") REFERENCES "connectors"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "model_sync_runs" ADD CONSTRAINT "model_sync_runs_connector_id_fkey" FOREIGN KEY ("connector_id") REFERENCES "connectors"("id") ON DELETE CASCADE ON UPDATE CASCADE;
