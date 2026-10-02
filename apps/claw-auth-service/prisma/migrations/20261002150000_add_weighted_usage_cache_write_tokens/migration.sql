-- F093: prompt tokens written into the provider's prompt cache, per settled
-- execution. Additive and defaulted, so every historical row stays valid and an
-- older auth-service build keeps running against the new schema.
ALTER TABLE "weighted_usage_records"
  ADD COLUMN IF NOT EXISTS "raw_cache_write_tokens" INTEGER NOT NULL DEFAULT 0;
