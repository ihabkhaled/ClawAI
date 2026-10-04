ALTER TYPE "ConnectorProvider" ADD VALUE 'CUSTOM_OPENAI_COMPATIBLE';

CREATE TYPE "ProviderAdapterFamily" AS ENUM ('OPENAI_COMPATIBLE');

CREATE TABLE "connector_provider_definitions" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "display_name" TEXT NOT NULL,
    "description" TEXT,
    "adapter_family" "ProviderAdapterFamily" NOT NULL,
    "default_base_url" TEXT NOT NULL,
    "models_endpoint" TEXT NOT NULL,
    "models_response_format" TEXT NOT NULL,
    "health_check_endpoint" TEXT,
    "auth_type" "ConnectorAuthType" NOT NULL,
    "supports_native_tools" BOOLEAN NOT NULL DEFAULT false,
    "supports_vision" BOOLEAN NOT NULL DEFAULT false,
    "register_url" TEXT,
    "api_key_url" TEXT,
    "pricing_url" TEXT,
    "docs_url" TEXT,
    "default_is_pay_as_you_go" BOOLEAN NOT NULL DEFAULT false,
    "has_free_tier" BOOLEAN NOT NULL DEFAULT false,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "is_built_in" BOOLEAN NOT NULL DEFAULT false,
    "ever_connected" BOOLEAN NOT NULL DEFAULT false,
    "capability_defaults" JSONB NOT NULL DEFAULT '{}',
    "created_by" TEXT,
    "updated_by" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "connector_provider_definitions_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "connectors" ADD COLUMN "provider_definition_id" TEXT;

CREATE UNIQUE INDEX "connector_provider_definitions_key_key"
ON "connector_provider_definitions"("key");

CREATE INDEX "connector_provider_definitions_is_active_updated_at_idx"
ON "connector_provider_definitions"("is_active", "updated_at");

CREATE INDEX "connector_provider_definitions_adapter_family_is_active_idx"
ON "connector_provider_definitions"("adapter_family", "is_active");

CREATE INDEX "connectors_provider_definition_id_idx"
ON "connectors"("provider_definition_id");

ALTER TABLE "connectors"
ADD CONSTRAINT "connectors_provider_definition_id_fkey"
FOREIGN KEY ("provider_definition_id") REFERENCES "connector_provider_definitions"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;
