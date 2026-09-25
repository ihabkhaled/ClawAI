-- ADR-122: media features are plan-gated server-side at the executing service.
--
-- Owner decision (2026-09-25): Free keeps the basics — image understanding,
-- voice notes, short video. Paid plans get everything — image generation and
-- edit, long video, helper vision, text-to-speech.
--
-- New columns are opt-in (DEFAULT false) like every gate before them, and the
-- video cap defaults to the FREE allowance (60 s) so no existing or future row
-- can land on NULL, which would mean unlimited.
ALTER TABLE "plans" ADD COLUMN "allow_image_generation" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "plans" ADD COLUMN "allow_helper_vision" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "plans" ADD COLUMN "allow_text_to_speech" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "plans" ADD COLUMN "max_video_seconds" INTEGER DEFAULT 60;

-- Paid tiers: everything on, 10 minutes of video. Keyed by slug, the same way
-- 20260822120000_apply_plan_feature_gate_tiers keys its tiers; a slug an
-- install does not have matches no row. Idempotent on re-run.
UPDATE "plans"
SET
  "allow_image_generation" = true,
  "allow_helper_vision" = true,
  "allow_text_to_speech" = true,
  "max_video_seconds" = 600
WHERE "slug" IN ('starter', 'plus', 'pro', 'team', 'scale', 'unlimited');

-- Free and the legacy trial row: the basics only, 60 s of video. Stated
-- explicitly rather than trusting the defaults, so the intent is in the file.
UPDATE "plans"
SET
  "allow_image_generation" = false,
  "allow_helper_vision" = false,
  "allow_text_to_speech" = false,
  "max_video_seconds" = 60
WHERE "slug" IN ('trial', 'free');

-- Any other row is an administrator-created custom plan. It keeps the free
-- defaults applied by the ADD COLUMN above; the operator opts it in from the
-- admin plan editor. A priced custom plan is NOT auto-promoted: a price is not
-- a product decision about media.
