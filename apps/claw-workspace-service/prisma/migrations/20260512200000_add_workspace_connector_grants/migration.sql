-- v3 round 5 (2026-05-12) — Prompt 12 polish: per-connector RBAC.
-- Owner (WorkspaceConnector.userId) always has full access. Rows below
-- record additional users granted a specific scope on a single
-- connector.
CREATE TYPE "WorkspaceConnectorAccessLevel" AS ENUM (
  'READ_ONLY',
  'AI_ACTIONS',
  'FULL'
);

CREATE TABLE "workspace_connector_grants" (
  "id"           TEXT NOT NULL,
  "connector_id" TEXT NOT NULL,
  "user_id"      VARCHAR(128) NOT NULL,
  "granted_by"   VARCHAR(128) NOT NULL,
  "access_level" "WorkspaceConnectorAccessLevel" NOT NULL DEFAULT 'AI_ACTIONS',
  "created_at"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at"   TIMESTAMP(3) NOT NULL,
  CONSTRAINT "workspace_connector_grants_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "workspace_connector_grants_connector_id_user_id_key"
  ON "workspace_connector_grants"("connector_id", "user_id");
CREATE INDEX "workspace_connector_grants_user_id_idx"
  ON "workspace_connector_grants"("user_id");
CREATE INDEX "workspace_connector_grants_connector_id_idx"
  ON "workspace_connector_grants"("connector_id");
