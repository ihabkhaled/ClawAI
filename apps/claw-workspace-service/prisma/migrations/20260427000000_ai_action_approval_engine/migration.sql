-- Stream 10: AI Action Approval Policy Engine
-- Adds AiActionPolicy + AiActionApprovalQueue tables and 3 supporting enums.
-- Additive only — does not modify existing WorkspaceAction or any other table.

CREATE TYPE "AiActionPolicyKind" AS ENUM ('DENY', 'ALLOW', 'AUTO_APPROVE');

CREATE TYPE "AiActionRiskLabel" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL');

CREATE TYPE "AiActionQueueStatus" AS ENUM (
  'PENDING_APPROVAL',
  'AUTO_APPROVED',
  'APPROVED',
  'REJECTED',
  'EXECUTING',
  'EXECUTED',
  'FAILED',
  'EXPIRED',
  'EDITED',
  'DENIED'
);

CREATE TABLE "ai_action_policies" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "kind" "AiActionPolicyKind" NOT NULL,
  "description" TEXT,
  "provider_regex" TEXT NOT NULL DEFAULT '.*',
  "action_kind_regex" TEXT NOT NULL DEFAULT '.*',
  "risk_max_label" "AiActionRiskLabel" NOT NULL DEFAULT 'LOW',
  "risk_max_score" INTEGER NOT NULL DEFAULT 30,
  "priority" INTEGER NOT NULL DEFAULT 0,
  "require_reason" BOOLEAN NOT NULL DEFAULT false,
  "is_active" BOOLEAN NOT NULL DEFAULT true,
  "is_system_default" BOOLEAN NOT NULL DEFAULT false,
  "created_by" VARCHAR(128),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ai_action_policies_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ai_action_policies_name_key" ON "ai_action_policies"("name");
CREATE INDEX "ai_action_policies_is_active_priority_idx"
  ON "ai_action_policies"("is_active", "priority");
CREATE INDEX "ai_action_policies_kind_idx" ON "ai_action_policies"("kind");

CREATE TABLE "ai_action_approval_queue" (
  "id" TEXT NOT NULL,
  "user_id" VARCHAR(128) NOT NULL,
  "connector_id" TEXT,
  "action_kind" VARCHAR(64) NOT NULL,
  "provider" "WorkspaceProvider",
  "status" "AiActionQueueStatus" NOT NULL DEFAULT 'PENDING_APPROVAL',
  "draft_payload" JSONB NOT NULL,
  "edited_payload" JSONB,
  "risk_label" "AiActionRiskLabel" NOT NULL DEFAULT 'LOW',
  "risk_score" INTEGER NOT NULL DEFAULT 0,
  "risk_reasons" JSONB NOT NULL DEFAULT '[]',
  "matched_policy_id" TEXT,
  "matched_policy_name" VARCHAR(256),
  "generated_by" JSONB,
  "source_object_id" TEXT,
  "rejection_reason" VARCHAR(1000),
  "error_message" VARCHAR(2000),
  "workspace_action_id" TEXT,
  "expires_at" TIMESTAMP(3),
  "status_changed_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ai_action_approval_queue_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ai_action_approval_queue_workspace_action_id_key"
  ON "ai_action_approval_queue"("workspace_action_id");
CREATE INDEX "ai_action_approval_queue_user_id_status_idx"
  ON "ai_action_approval_queue"("user_id", "status");
CREATE INDEX "ai_action_approval_queue_status_expires_at_idx"
  ON "ai_action_approval_queue"("status", "expires_at");
CREATE INDEX "ai_action_approval_queue_connector_id_idx"
  ON "ai_action_approval_queue"("connector_id");
CREATE INDEX "ai_action_approval_queue_created_at_idx"
  ON "ai_action_approval_queue"("created_at");

ALTER TABLE "ai_action_approval_queue"
  ADD CONSTRAINT "ai_action_approval_queue_matched_policy_id_fkey"
  FOREIGN KEY ("matched_policy_id") REFERENCES "ai_action_policies"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;
