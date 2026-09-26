-- "Read aloud" voice preference (ADR-120 addendum "voice picker").
--
-- Nullable: null means each speech provider reads with its own default voice,
-- which is what every existing user hears today. Values are validated against
-- @claw/shared-constants TTS_VOICES_BY_PROVIDER at the API; the column only
-- bounds the length.
ALTER TABLE "users" ADD COLUMN "tts_voice" VARCHAR(32);
