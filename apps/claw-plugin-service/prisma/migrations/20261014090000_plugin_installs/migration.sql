-- Additive: installs, tool consents, write-only credentials and the invocation audit table.

-- CreateEnum
CREATE TYPE "AuthKind" AS ENUM ('NONE', 'API_KEY', 'BEARER_TOKEN', 'OAUTH2_PKCE');

-- CreateEnum
CREATE TYPE "InstallStatus" AS ENUM ('ENABLED', 'DISABLED');

-- CreateEnum
CREATE TYPE "InvocationStatus" AS ENUM ('OK', 'ERROR', 'TIMEOUT', 'DENIED', 'CONSENT_DECLINED', 'CONSENT_TIMEOUT', 'RATE_LIMITED', 'QUOTA_EXCEEDED', 'BLOCKED');

-- CreateTable
CREATE TABLE "plugin_installs" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "plugin_id" TEXT NOT NULL,
    "version_id" TEXT NOT NULL,
    "status" "InstallStatus" NOT NULL DEFAULT 'ENABLED',
    "settings" JSONB NOT NULL DEFAULT '{}',
    "installed_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "plugin_installs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "plugin_tool_consents" (
    "id" TEXT NOT NULL,
    "install_id" TEXT NOT NULL,
    "tool_name" TEXT NOT NULL,
    "level" "RiskLevel" NOT NULL,
    "granted_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "plugin_tool_consents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "plugin_credentials" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "install_id" TEXT NOT NULL,
    "kind" "AuthKind" NOT NULL,
    "header_name" TEXT,
    "ciphertext" TEXT NOT NULL,
    "key_version" INTEGER NOT NULL DEFAULT 1,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "plugin_credentials_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "plugin_invocations" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "install_id" TEXT NOT NULL,
    "plugin_id" TEXT NOT NULL,
    "tool_name" TEXT NOT NULL,
    "conversation_id" TEXT,
    "message_id" TEXT,
    "surface" TEXT NOT NULL,
    "status" "InvocationStatus" NOT NULL,
    "risk_level" "RiskLevel" NOT NULL,
    "consent_decision" TEXT,
    "tainted_turn" BOOLEAN NOT NULL DEFAULT false,
    "args_hash" TEXT NOT NULL,
    "args_preview" TEXT,
    "result_bytes" INTEGER,
    "truncated" BOOLEAN NOT NULL DEFAULT false,
    "error_code" TEXT,
    "duration_ms" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "plugin_invocations_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "plugin_installs_user_id_plugin_id_key" ON "plugin_installs"("user_id", "plugin_id");

-- CreateIndex
CREATE INDEX "plugin_installs_user_id_status_idx" ON "plugin_installs"("user_id", "status");

-- CreateIndex
CREATE INDEX "plugin_installs_plugin_id_idx" ON "plugin_installs"("plugin_id");

-- CreateIndex
CREATE UNIQUE INDEX "plugin_tool_consents_install_id_tool_name_key" ON "plugin_tool_consents"("install_id", "tool_name");

-- CreateIndex
CREATE UNIQUE INDEX "plugin_credentials_install_id_key" ON "plugin_credentials"("install_id");

-- CreateIndex
CREATE INDEX "plugin_credentials_user_id_idx" ON "plugin_credentials"("user_id");

-- CreateIndex
CREATE INDEX "plugin_invocations_user_id_created_at_idx" ON "plugin_invocations"("user_id", "created_at");

-- CreateIndex
CREATE INDEX "plugin_invocations_plugin_id_created_at_idx" ON "plugin_invocations"("plugin_id", "created_at");

-- CreateIndex
CREATE INDEX "plugin_invocations_install_id_idx" ON "plugin_invocations"("install_id");

-- AddForeignKey
ALTER TABLE "plugin_installs" ADD CONSTRAINT "plugin_installs_plugin_id_fkey" FOREIGN KEY ("plugin_id") REFERENCES "plugin_catalog_entries"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "plugin_installs" ADD CONSTRAINT "plugin_installs_version_id_fkey" FOREIGN KEY ("version_id") REFERENCES "plugin_versions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "plugin_tool_consents" ADD CONSTRAINT "plugin_tool_consents_install_id_fkey" FOREIGN KEY ("install_id") REFERENCES "plugin_installs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "plugin_credentials" ADD CONSTRAINT "plugin_credentials_install_id_fkey" FOREIGN KEY ("install_id") REFERENCES "plugin_installs"("id") ON DELETE CASCADE ON UPDATE CASCADE;
