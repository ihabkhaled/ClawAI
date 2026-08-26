-- Post-pack hardening — ConnectorAccessService.revoke() previously
-- hard-deleted the grant row with no durable trail. This append-only
-- table captures a full snapshot immediately before the delete.
CREATE TABLE "workspace_connector_grant_audit_logs" (
  "id"              TEXT NOT NULL,
  "connector_id"    TEXT NOT NULL,
  "grantee_user_id" VARCHAR(128) NOT NULL,
  "access_level"    "WorkspaceConnectorAccessLevel" NOT NULL,
  "granted_by"      VARCHAR(128) NOT NULL,
  "granted_at"      TIMESTAMP(3) NOT NULL,
  "revoked_by"      VARCHAR(128) NOT NULL,
  "revoked_at"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "workspace_connector_grant_audit_logs_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "workspace_connector_grant_audit_logs_connector_id_idx"
  ON "workspace_connector_grant_audit_logs"("connector_id");
CREATE INDEX "workspace_connector_grant_audit_logs_grantee_user_id_idx"
  ON "workspace_connector_grant_audit_logs"("grantee_user_id");
