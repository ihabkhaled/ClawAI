-- CreateEnum
CREATE TYPE "WorkspaceProvider" AS ENUM ('GITHUB', 'GITLAB', 'BITBUCKET', 'SLACK', 'JIRA', 'CONFLUENCE', 'FIGMA', 'CLICKUP', 'GOOGLE_DRIVE', 'GMAIL', 'MICROSOFT_SHAREPOINT', 'MICROSOFT_ONEDRIVE');

-- CreateEnum
CREATE TYPE "WorkspaceConnectorStatus" AS ENUM ('CONNECTED', 'DEGRADED', 'DISCONNECTED', 'PENDING_AUTH', 'UNKNOWN');

-- CreateEnum
CREATE TYPE "WorkspaceSyncStatus" AS ENUM ('RUNNING', 'COMPLETED', 'FAILED', 'PARTIAL');

-- CreateEnum
CREATE TYPE "WorkspaceObjectType" AS ENUM ('REPOSITORY', 'ISSUE', 'PULL_REQUEST', 'MESSAGE', 'CHANNEL', 'DOCUMENT', 'FILE', 'TICKET', 'COMMENT', 'USER', 'PROJECT', 'EMAIL', 'MEETING_NOTE', 'SPREADSHEET');

-- CreateEnum
CREATE TYPE "WorkspacePermissionLevel" AS ENUM ('READ', 'WRITE', 'ADMIN');

-- CreateTable
CREATE TABLE "workspace_connectors" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "provider" "WorkspaceProvider" NOT NULL,
    "status" "WorkspaceConnectorStatus" NOT NULL DEFAULT 'PENDING_AUTH',
    "permission_level" "WorkspacePermissionLevel" NOT NULL DEFAULT 'READ',
    "encrypted_tokens" TEXT,
    "scopes" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "expires_at" TIMESTAMP(3),
    "last_sync_at" TIMESTAMP(3),
    "delta_token" TEXT,
    "is_enabled" BOOLEAN NOT NULL DEFAULT true,
    "webhook_id" TEXT,
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "object_count" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "workspace_connectors_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "workspace_sync_runs" (
    "id" TEXT NOT NULL,
    "connector_id" TEXT NOT NULL,
    "status" "WorkspaceSyncStatus" NOT NULL,
    "object_type" "WorkspaceObjectType" NOT NULL,
    "is_delta" BOOLEAN NOT NULL DEFAULT false,
    "objects_found" INTEGER NOT NULL DEFAULT 0,
    "objects_synced" INTEGER NOT NULL DEFAULT 0,
    "objects_failed" INTEGER NOT NULL DEFAULT 0,
    "delta_token_in" TEXT,
    "delta_token_out" TEXT,
    "started_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completed_at" TIMESTAMP(3),
    "error_message" TEXT,

    CONSTRAINT "workspace_sync_runs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "workspace_health_events" (
    "id" TEXT NOT NULL,
    "connector_id" TEXT NOT NULL,
    "status" "WorkspaceConnectorStatus" NOT NULL,
    "latency_ms" INTEGER,
    "error_message" TEXT,
    "checked_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "workspace_health_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "workspace_objects" (
    "id" TEXT NOT NULL,
    "connector_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "external_id" TEXT NOT NULL,
    "type" "WorkspaceObjectType" NOT NULL,
    "title" TEXT NOT NULL,
    "content" TEXT,
    "url" TEXT,
    "author_id" TEXT,
    "provider" "WorkspaceProvider" NOT NULL,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "external_created_at" TIMESTAMP(3),
    "external_updated_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "workspace_objects_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "workspace_object_links" (
    "id" TEXT NOT NULL,
    "source_object_id" TEXT NOT NULL,
    "target_object_id" TEXT,
    "external_ref" TEXT,
    "link_type" TEXT NOT NULL,
    "confidence" DOUBLE PRECISION NOT NULL DEFAULT 1.0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "workspace_object_links_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "workspace_connectors_user_id_idx" ON "workspace_connectors"("user_id");
CREATE INDEX "workspace_connectors_provider_idx" ON "workspace_connectors"("provider");
CREATE INDEX "workspace_connectors_status_idx" ON "workspace_connectors"("status");
CREATE INDEX "workspace_connectors_is_enabled_idx" ON "workspace_connectors"("is_enabled");

CREATE INDEX "workspace_sync_runs_connector_id_idx" ON "workspace_sync_runs"("connector_id");
CREATE INDEX "workspace_sync_runs_status_idx" ON "workspace_sync_runs"("status");
CREATE INDEX "workspace_sync_runs_started_at_idx" ON "workspace_sync_runs"("started_at");

CREATE INDEX "workspace_health_events_connector_id_idx" ON "workspace_health_events"("connector_id");
CREATE INDEX "workspace_health_events_checked_at_idx" ON "workspace_health_events"("checked_at");

CREATE UNIQUE INDEX "workspace_objects_connector_id_external_id_key" ON "workspace_objects"("connector_id", "external_id");
CREATE INDEX "workspace_objects_user_id_idx" ON "workspace_objects"("user_id");
CREATE INDEX "workspace_objects_connector_id_idx" ON "workspace_objects"("connector_id");
CREATE INDEX "workspace_objects_type_idx" ON "workspace_objects"("type");

CREATE INDEX "workspace_object_links_source_object_id_idx" ON "workspace_object_links"("source_object_id");
CREATE INDEX "workspace_object_links_target_object_id_idx" ON "workspace_object_links"("target_object_id");

-- AddForeignKey
ALTER TABLE "workspace_sync_runs" ADD CONSTRAINT "workspace_sync_runs_connector_id_fkey" FOREIGN KEY ("connector_id") REFERENCES "workspace_connectors"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "workspace_health_events" ADD CONSTRAINT "workspace_health_events_connector_id_fkey" FOREIGN KEY ("connector_id") REFERENCES "workspace_connectors"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "workspace_objects" ADD CONSTRAINT "workspace_objects_connector_id_fkey" FOREIGN KEY ("connector_id") REFERENCES "workspace_connectors"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "workspace_object_links" ADD CONSTRAINT "workspace_object_links_source_object_id_fkey" FOREIGN KEY ("source_object_id") REFERENCES "workspace_objects"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "workspace_object_links" ADD CONSTRAINT "workspace_object_links_target_object_id_fkey" FOREIGN KEY ("target_object_id") REFERENCES "workspace_objects"("id") ON DELETE SET NULL ON UPDATE CASCADE;
