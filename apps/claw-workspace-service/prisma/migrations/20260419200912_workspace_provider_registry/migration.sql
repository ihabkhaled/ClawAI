-- CreateEnum
CREATE TYPE "WorkspaceProviderAuthMode" AS ENUM ('OAUTH2', 'PAT', 'BASIC', 'SERVICE_ACCOUNT', 'NONE');

-- CreateEnum
CREATE TYPE "WorkspaceProviderDefinitionStatus" AS ENUM ('ACTIVE', 'BETA', 'DEPRECATED', 'DISABLED');

-- CreateEnum
CREATE TYPE "WorkspaceProviderAppConfigStatus" AS ENUM ('DRAFT', 'READY', 'DISABLED', 'INVALID');

-- CreateTable
CREATE TABLE "workspace_provider_definitions" (
    "id" TEXT NOT NULL,
    "provider" "WorkspaceProvider" NOT NULL,
    "display_name" TEXT NOT NULL,
    "description" TEXT,
    "auth_modes" "WorkspaceProviderAuthMode"[],
    "default_auth_mode" "WorkspaceProviderAuthMode" NOT NULL,
    "config_schema" JSONB NOT NULL,
    "capabilities" JSONB NOT NULL DEFAULT '{}',
    "supported_objects" "WorkspaceObjectType"[],
    "supported_actions" "WorkspaceActionType"[],
    "icon_url" TEXT,
    "docs_url" TEXT,
    "adapter_key" TEXT NOT NULL,
    "status" "WorkspaceProviderDefinitionStatus" NOT NULL DEFAULT 'ACTIVE',
    "version" INTEGER NOT NULL DEFAULT 1,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "workspace_provider_definitions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "workspace_provider_app_configs" (
    "id" TEXT NOT NULL,
    "provider" "WorkspaceProvider" NOT NULL,
    "definition_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "auth_mode" "WorkspaceProviderAuthMode" NOT NULL,
    "public_config" JSONB NOT NULL DEFAULT '{}',
    "encrypted_secret" TEXT,
    "secret_version" INTEGER NOT NULL DEFAULT 0,
    "scopes" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "status" "WorkspaceProviderAppConfigStatus" NOT NULL DEFAULT 'DRAFT',
    "last_validated_at" TIMESTAMP(3),
    "validation_error" TEXT,
    "created_by" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "workspace_provider_app_configs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "workspace_provider_definitions_provider_key" ON "workspace_provider_definitions"("provider");

-- CreateIndex
CREATE INDEX "workspace_provider_definitions_status_idx" ON "workspace_provider_definitions"("status");

-- CreateIndex
CREATE INDEX "workspace_provider_app_configs_status_idx" ON "workspace_provider_app_configs"("status");

-- CreateIndex
CREATE INDEX "workspace_provider_app_configs_definition_id_idx" ON "workspace_provider_app_configs"("definition_id");

-- CreateIndex
CREATE UNIQUE INDEX "workspace_provider_app_configs_provider_name_key" ON "workspace_provider_app_configs"("provider", "name");

-- AddForeignKey
ALTER TABLE "workspace_provider_app_configs" ADD CONSTRAINT "workspace_provider_app_configs_definition_id_fkey" FOREIGN KEY ("definition_id") REFERENCES "workspace_provider_definitions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
