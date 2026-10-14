-- Additive and idempotent: user MCP servers, their tool snapshot and write-only credential, and the
-- invocation audit changes the invoke path needs (a call may target a server, and has an idempotency key).

-- CreateEnum
DO $$ BEGIN
  CREATE TYPE "ServerStatus" AS ENUM ('PENDING_APPROVAL', 'APPROVED', 'REJECTED', 'DISABLED', 'NEEDS_REVIEW', 'UNREACHABLE');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- CreateTable
CREATE TABLE IF NOT EXISTS "mcp_servers" (
    "id" TEXT NOT NULL,
    "owner_user_id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "url_host" TEXT NOT NULL,
    "auth_kind" "AuthKind" NOT NULL,
    "status" "ServerStatus" NOT NULL,
    "server_info" JSONB,
    "tools_hash" TEXT,
    "last_checked_at" TIMESTAMP(3),
    "last_error_code" TEXT,
    "failure_count" INTEGER NOT NULL DEFAULT 0,
    "breaker_opened_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "mcp_servers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "mcp_server_tools" (
    "id" TEXT NOT NULL,
    "server_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "local_name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "input_schema" JSONB NOT NULL,
    "schema_hash" TEXT NOT NULL,
    "risk_level" "RiskLevel" NOT NULL DEFAULT 'WRITE',
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "consent_granted" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "mcp_server_tools_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "mcp_server_credentials" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "server_id" TEXT NOT NULL,
    "kind" "AuthKind" NOT NULL,
    "header_name" TEXT NOT NULL,
    "ciphertext" TEXT NOT NULL,
    "key_version" INTEGER NOT NULL DEFAULT 1,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "mcp_server_credentials_pkey" PRIMARY KEY ("id")
);

-- A call targets a catalog install or a user server: relax the install columns, add the server and call id.
ALTER TABLE "plugin_invocations" ALTER COLUMN "install_id" DROP NOT NULL;
ALTER TABLE "plugin_invocations" ALTER COLUMN "plugin_id" DROP NOT NULL;
ALTER TABLE "plugin_invocations" ADD COLUMN IF NOT EXISTS "server_id" TEXT;
ALTER TABLE "plugin_invocations" ADD COLUMN IF NOT EXISTS "call_id" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "mcp_servers_slug_key" ON "mcp_servers"("slug");
CREATE UNIQUE INDEX IF NOT EXISTS "mcp_servers_owner_user_id_url_key" ON "mcp_servers"("owner_user_id", "url");
CREATE INDEX IF NOT EXISTS "mcp_servers_owner_user_id_status_idx" ON "mcp_servers"("owner_user_id", "status");
CREATE INDEX IF NOT EXISTS "mcp_servers_url_host_idx" ON "mcp_servers"("url_host");
CREATE UNIQUE INDEX IF NOT EXISTS "mcp_server_tools_server_id_name_key" ON "mcp_server_tools"("server_id", "name");
CREATE UNIQUE INDEX IF NOT EXISTS "mcp_server_tools_server_id_local_name_key" ON "mcp_server_tools"("server_id", "local_name");
CREATE UNIQUE INDEX IF NOT EXISTS "mcp_server_credentials_server_id_key" ON "mcp_server_credentials"("server_id");
CREATE INDEX IF NOT EXISTS "mcp_server_credentials_user_id_idx" ON "mcp_server_credentials"("user_id");
CREATE UNIQUE INDEX IF NOT EXISTS "plugin_invocations_user_id_call_id_key" ON "plugin_invocations"("user_id", "call_id");
CREATE INDEX IF NOT EXISTS "plugin_invocations_server_id_idx" ON "plugin_invocations"("server_id");

-- AddForeignKey
DO $$ BEGIN
  ALTER TABLE "mcp_server_tools" ADD CONSTRAINT "mcp_server_tools_server_id_fkey" FOREIGN KEY ("server_id") REFERENCES "mcp_servers"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "mcp_server_credentials" ADD CONSTRAINT "mcp_server_credentials_server_id_fkey" FOREIGN KEY ("server_id") REFERENCES "mcp_servers"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
