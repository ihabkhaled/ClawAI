-- F093: per-model switch for Anthropic prompt caching. Additive and defaulted
-- OFF, so no existing model changes behaviour until an administrator flips it.
ALTER TABLE "connector_models"
  ADD COLUMN IF NOT EXISTS "prompt_caching" BOOLEAN NOT NULL DEFAULT false;
