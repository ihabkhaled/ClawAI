-- Semantic Router Flagship — Phase 6 (Workflow live wiring)
-- Adds optional storage for the live workflow selector's output.
-- Both columns are nullable so the v1 hot path can keep writing
-- decisions when the wiring is disabled or the selector is skipped.

ALTER TABLE "routing_decisions"
  ADD COLUMN IF NOT EXISTS "selected_workflow" "WorkflowKind",
  ADD COLUMN IF NOT EXISTS "workflow_reason" TEXT;

CREATE INDEX IF NOT EXISTS "routing_decisions_selected_workflow_idx"
  ON "routing_decisions" ("selected_workflow");
