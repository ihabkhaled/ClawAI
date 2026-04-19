-- AlterTable
ALTER TABLE "workspace_connectors" ADD COLUMN     "auth_mode" "WorkspaceProviderAuthMode",
ADD COLUMN     "last_auth_at" TIMESTAMP(3),
ADD COLUMN     "provider_app_config_id" TEXT,
ADD COLUMN     "status_reason" TEXT,
ADD COLUMN     "token_version" INTEGER NOT NULL DEFAULT 0;

-- CreateIndex
CREATE INDEX "workspace_connectors_provider_app_config_id_idx" ON "workspace_connectors"("provider_app_config_id");

-- AddForeignKey
ALTER TABLE "workspace_connectors" ADD CONSTRAINT "workspace_connectors_provider_app_config_id_fkey" FOREIGN KEY ("provider_app_config_id") REFERENCES "workspace_provider_app_configs"("id") ON DELETE SET NULL ON UPDATE CASCADE;
