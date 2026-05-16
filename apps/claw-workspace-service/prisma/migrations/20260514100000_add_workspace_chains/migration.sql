-- v3 round 12 (2026-05-14) — Prompt 11: cross-workspace automation chains.
CREATE TYPE "WorkspaceChainRunStatus" AS ENUM ('PENDING', 'RUNNING', 'COMPLETED', 'FAILED');
CREATE TYPE "WorkspaceChainStepStatus" AS ENUM ('PENDING', 'RUNNING', 'SUCCEEDED', 'FAILED', 'SKIPPED');

CREATE TABLE "workspace_chains" (
  "id"          TEXT NOT NULL,
  "user_id"     VARCHAR(128) NOT NULL,
  "name"        VARCHAR(160) NOT NULL,
  "description" TEXT,
  "dsl"         JSONB NOT NULL,
  "is_enabled"  BOOLEAN NOT NULL DEFAULT true,
  "version"     INTEGER NOT NULL DEFAULT 1,
  "created_at"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at"  TIMESTAMP(3) NOT NULL,
  CONSTRAINT "workspace_chains_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "workspace_chains_user_id_name_key" ON "workspace_chains"("user_id", "name");
CREATE INDEX "workspace_chains_user_id_idx" ON "workspace_chains"("user_id");

CREATE TABLE "workspace_chain_runs" (
  "id"           TEXT NOT NULL,
  "chain_id"     TEXT NOT NULL,
  "user_id"      VARCHAR(128) NOT NULL,
  "status"       "WorkspaceChainRunStatus" NOT NULL DEFAULT 'PENDING',
  "dsl_snapshot" JSONB NOT NULL,
  "error"        TEXT,
  "started_at"   TIMESTAMP(3),
  "finished_at"  TIMESTAMP(3),
  "created_at"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at"   TIMESTAMP(3) NOT NULL,
  CONSTRAINT "workspace_chain_runs_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "workspace_chain_runs_chain_id_idx" ON "workspace_chain_runs"("chain_id");
CREATE INDEX "workspace_chain_runs_user_id_idx" ON "workspace_chain_runs"("user_id");

CREATE TABLE "workspace_chain_run_steps" (
  "id"               TEXT NOT NULL,
  "run_id"           TEXT NOT NULL,
  "step_id"          VARCHAR(120) NOT NULL,
  "step_index"       INTEGER NOT NULL,
  "connector_id"     TEXT NOT NULL,
  "action_type"      VARCHAR(64) NOT NULL,
  "status"           "WorkspaceChainStepStatus" NOT NULL DEFAULT 'PENDING',
  "resolved_payload" JSONB,
  "output"           JSONB,
  "error"            TEXT,
  "started_at"       TIMESTAMP(3),
  "finished_at"      TIMESTAMP(3),
  "created_at"       TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "workspace_chain_run_steps_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "workspace_chain_run_steps_run_id_idx" ON "workspace_chain_run_steps"("run_id");

ALTER TABLE "workspace_chain_runs"
  ADD CONSTRAINT "workspace_chain_runs_chain_id_fkey"
  FOREIGN KEY ("chain_id") REFERENCES "workspace_chains"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "workspace_chain_run_steps"
  ADD CONSTRAINT "workspace_chain_run_steps_run_id_fkey"
  FOREIGN KEY ("run_id") REFERENCES "workspace_chain_runs"("id") ON DELETE CASCADE ON UPDATE CASCADE;
