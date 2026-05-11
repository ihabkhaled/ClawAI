-- v3 round (2026-05-11) — Gmail createDraft support.
-- Adds the CREATE_DRAFT variant to the WorkspaceActionType enum so the
-- approval queue + ActionExecutionManager can route AI-suggested drafts
-- to the Gmail adapter's drafts.create endpoint.
ALTER TYPE "WorkspaceActionType" ADD VALUE IF NOT EXISTS 'CREATE_DRAFT';
