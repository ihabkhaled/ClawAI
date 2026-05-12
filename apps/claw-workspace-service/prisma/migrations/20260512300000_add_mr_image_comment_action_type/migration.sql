-- v3 round 6 (2026-05-12) — image-anchored GitLab MR comment.
-- Adds ADD_MR_IMAGE_COMMENT variant so the approval queue can route
-- image-coordinate-anchored comments to GitLab's POST
-- /merge_requests/:iid/discussions endpoint with position_type='image'.
ALTER TYPE "WorkspaceActionType" ADD VALUE IF NOT EXISTS 'ADD_MR_IMAGE_COMMENT';
