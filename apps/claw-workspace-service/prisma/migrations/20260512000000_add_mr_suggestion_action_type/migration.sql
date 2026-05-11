-- v3 round 2 (2026-05-12) — line-level GitLab MR discussion thread.
-- Adds ADD_MR_SUGGESTION variant so the approval queue can route line-anchored
-- code suggestions to GitLab's POST /merge_requests/:iid/discussions endpoint
-- (mirrors GitHub's existing ADD_PR_SUGGESTION).
ALTER TYPE "WorkspaceActionType" ADD VALUE IF NOT EXISTS 'ADD_MR_SUGGESTION';
