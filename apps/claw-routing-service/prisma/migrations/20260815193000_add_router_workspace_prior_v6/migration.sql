-- Cloud Smart Router — Batch 11, Learning Evolution V6 ("Tenant/domain/user
-- personalization")
-- ADR-070: workspace-tier hierarchical priors only. A new table layered on
-- top of the existing RouterModelProfile global tier — that table's schema,
-- unique constraint, and every current reader/writer are untouched by this
-- migration. RouterWorkspacePrior is additive and, on its own, inert: no
-- current caller populates workspace_id anywhere upstream, so this migration
-- changes no live behavior until a future batch threads a real workspace id
-- through from chat-service.

-- Raw observation: opaque workspace attribution (V6 tenant scoping, D8).
-- Nullable — no current caller populates it.
ALTER TABLE "routing_outcome_records"
  ADD COLUMN IF NOT EXISTS "workspace_id" TEXT;

-- CreateIndex
CREATE INDEX IF NOT EXISTS "routing_outcome_records_workspace_id_idx" ON "routing_outcome_records"("workspace_id");

-- CreateTable
CREATE TABLE IF NOT EXISTS "router_workspace_priors" (
  "id"                  TEXT NOT NULL,
  "workspace_id"        TEXT NOT NULL,
  "provider"            TEXT NOT NULL,
  "model"               TEXT NOT NULL,
  "task_family"         TEXT NOT NULL,
  "route_count"         INTEGER NOT NULL DEFAULT 0,
  "success_rate"        DECIMAL(6,4) NOT NULL DEFAULT 0,
  "confidence_in_prior" DECIMAL(6,4) NOT NULL DEFAULT 0,
  "score_version"       TEXT,
  "last_updated"        TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "created_at"          TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "router_workspace_priors_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "router_workspace_priors_workspace_id_provider_model_task_f_key"
  ON "router_workspace_priors"("workspace_id", "provider", "model", "task_family");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "router_workspace_priors_workspace_id_idx" ON "router_workspace_priors"("workspace_id");
