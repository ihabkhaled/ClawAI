-- CreateEnum
CREATE TYPE "WorkspaceActionType" AS ENUM ('CREATE_ISSUE', 'CREATE_ISSUE_COMMENT', 'CREATE_PR_DESCRIPTION', 'CREATE_TICKET', 'ADD_TICKET_COMMENT', 'SEND_SLACK_MESSAGE');

-- CreateEnum
CREATE TYPE "WorkspaceActionStatus" AS ENUM ('PENDING_APPROVAL', 'APPROVED', 'REJECTED', 'EXECUTING', 'EXECUTED', 'FAILED', 'EXPIRED');

-- CreateTable
CREATE TABLE "workspace_actions" (
    "id" TEXT NOT NULL,
    "user_id" VARCHAR(128) NOT NULL,
    "connector_id" TEXT NOT NULL,
    "action_type" "WorkspaceActionType" NOT NULL,
    "status" "WorkspaceActionStatus" NOT NULL DEFAULT 'PENDING_APPROVAL',
    "payload" JSONB NOT NULL,
    "result" JSONB,
    "requested_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reviewed_at" TIMESTAMP(3),
    "executed_at" TIMESTAMP(3),
    "expires_at" TIMESTAMP(3),
    "reviewed_by" VARCHAR(128),
    "rejection_reason" VARCHAR(1000),
    "error_message" VARCHAR(2000),

    CONSTRAINT "workspace_actions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "workspace_actions_user_id_idx" ON "workspace_actions"("user_id");
CREATE INDEX "workspace_actions_connector_id_idx" ON "workspace_actions"("connector_id");
CREATE INDEX "workspace_actions_status_idx" ON "workspace_actions"("status");
CREATE INDEX "workspace_actions_requested_at_idx" ON "workspace_actions"("requested_at");

-- AddForeignKey
ALTER TABLE "workspace_actions" ADD CONSTRAINT "workspace_actions_connector_id_fkey" FOREIGN KEY ("connector_id") REFERENCES "workspace_connectors"("id") ON DELETE CASCADE ON UPDATE CASCADE;
