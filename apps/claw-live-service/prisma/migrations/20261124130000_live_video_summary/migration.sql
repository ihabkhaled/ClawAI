-- ADR-221 batch 6 (2026-11-24): one-click "Summarize video" sessions, billed by processed media seconds. Additive only.
ALTER TABLE "live_viewer_sessions" ADD COLUMN "summary" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "live_viewer_sessions" ADD COLUMN "accrued_media_seconds" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "live_processing_runs" ADD COLUMN "processed_media_seconds" INTEGER NOT NULL DEFAULT 0;
