-- Workspace Automation Phase 07 (scoped slice) — chain template catalog.
-- See schema.prisma for field notes.
CREATE TABLE "workspace_chain_templates" (
  "id"                 TEXT NOT NULL,
  "key"                VARCHAR(80) NOT NULL,
  "name"               VARCHAR(160) NOT NULL,
  "description"        TEXT NOT NULL,
  "category"           VARCHAR(60) NOT NULL,
  "required_providers" "WorkspaceProvider"[],
  "dsl_template"       JSONB NOT NULL,
  "version"            INTEGER NOT NULL DEFAULT 1,
  "created_at"         TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at"         TIMESTAMP(3) NOT NULL,
  CONSTRAINT "workspace_chain_templates_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "workspace_chain_templates_key_key" ON "workspace_chain_templates"("key");
