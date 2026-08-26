-- Workspace Automation Phase 06 — error taxonomy + manual-repair tracking
-- on the existing sequential chain executor. See schema.prisma for field
-- notes.
CREATE TYPE "WorkspaceChainStepErrorClass" AS ENUM ('TRANSIENT', 'AUTH', 'RATE_LIMIT', 'VALIDATION', 'PERMISSION', 'CONFLICT', 'PERMANENT');

ALTER TABLE "workspace_chain_runs" ADD COLUMN "was_resumed" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "workspace_chain_run_steps" ADD COLUMN "error_class" "WorkspaceChainStepErrorClass";
