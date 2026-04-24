-- Stream 02 Phase 5 — Approval Center v3 expansion
-- Additive: expands WorkspaceActionType enum with v3 action types, adds
-- attribution + edit-history + stale-source + bulk-group columns on
-- workspace_actions. Backward compatible.

-- 1. New action types per FEATURES_v3 §Stream02
ALTER TYPE "WorkspaceActionType" ADD VALUE IF NOT EXISTS 'SEND_EMAIL';
ALTER TYPE "WorkspaceActionType" ADD VALUE IF NOT EXISTS 'REPLY_EMAIL';
ALTER TYPE "WorkspaceActionType" ADD VALUE IF NOT EXISTS 'UPDATE_JIRA_ISSUE';
ALTER TYPE "WorkspaceActionType" ADD VALUE IF NOT EXISTS 'COMMENT_JIRA';
ALTER TYPE "WorkspaceActionType" ADD VALUE IF NOT EXISTS 'COMMENT_PR';
ALTER TYPE "WorkspaceActionType" ADD VALUE IF NOT EXISTS 'APPROVE_PR';
ALTER TYPE "WorkspaceActionType" ADD VALUE IF NOT EXISTS 'ADD_PR_SUGGESTION';
ALTER TYPE "WorkspaceActionType" ADD VALUE IF NOT EXISTS 'SEND_SLACK';
ALTER TYPE "WorkspaceActionType" ADD VALUE IF NOT EXISTS 'REPLY_SLACK';
ALTER TYPE "WorkspaceActionType" ADD VALUE IF NOT EXISTS 'EDIT_CONFLUENCE';
ALTER TYPE "WorkspaceActionType" ADD VALUE IF NOT EXISTS 'CREATE_CONFLUENCE';
ALTER TYPE "WorkspaceActionType" ADD VALUE IF NOT EXISTS 'UPLOAD_DRIVE';
ALTER TYPE "WorkspaceActionType" ADD VALUE IF NOT EXISTS 'MOVE_DRIVE';
ALTER TYPE "WorkspaceActionType" ADD VALUE IF NOT EXISTS 'CREATE_USER_STORY_FROM_FIGMA';
ALTER TYPE "WorkspaceActionType" ADD VALUE IF NOT EXISTS 'CREATE_JIRA_FROM_FIGMA';
ALTER TYPE "WorkspaceActionType" ADD VALUE IF NOT EXISTS 'POST_FIGMA_COMMENT';

-- 2. New status entry for edited-pending-reapproval flow
ALTER TYPE "WorkspaceActionStatus" ADD VALUE IF NOT EXISTS 'EDITED';

-- 3. Attribution + edit history + stale source + bulk group columns
ALTER TABLE "workspace_actions"
  ADD COLUMN IF NOT EXISTS "generated_by"       JSONB,
  ADD COLUMN IF NOT EXISTS "draft_history"      JSONB NOT NULL DEFAULT '[]',
  ADD COLUMN IF NOT EXISTS "source_object_id"   TEXT,
  ADD COLUMN IF NOT EXISTS "source_fetched_at"  TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS "bulk_group_id"      TEXT;

CREATE INDEX IF NOT EXISTS "workspace_actions_bulk_group_idx"
  ON "workspace_actions" ("bulk_group_id") WHERE "bulk_group_id" IS NOT NULL;
