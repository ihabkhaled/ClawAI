-- Adds the per-model native video-input capability flag.
--
-- `false` is the fail-closed default: an existing row gains `true` only when
-- the next connector sync runs the owning adapter's heuristic
-- (`gemini-video-heuristics.constants.ts` today; every other adapter writes
-- `false`). No backfill here on purpose — the heuristic lives in code, and a
-- resync writes the flag on both the create and the update branch.
ALTER TABLE "connector_models" ADD COLUMN "supports_video_input" BOOLEAN NOT NULL DEFAULT false;
