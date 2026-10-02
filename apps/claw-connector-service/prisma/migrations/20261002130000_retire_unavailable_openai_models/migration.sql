-- Retired models the provider still lists (ADR-151).
--
-- OpenAI keeps listing models in /v1/models that it no longer serves: calling
-- them answers 404 `model_not_found` ("has been deprecated"), or they are legacy
-- completions / responses-only deployments the chat path cannot call. They stayed
-- ACTIVE and EXPOSED, so users could pin a model that never answers.
--
-- 1. `unavailable_count` / `unavailable_at`: chat-service reports every
--    "model does not exist" answer; three inside seven days retire the row
--    (lifecycle SUNSET, exposure UNEXPOSED), and a sync does not bring it back.
-- 2. Data fix for the models already known to be retired. The same patterns
--    live in OPENAI_RETIRED_MODEL_PATTERNS, so the next sync keeps them SUNSET
--    on a fresh database and in production alike. Idempotent.
ALTER TABLE "connector_models" ADD COLUMN "unavailable_count" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "connector_models" ADD COLUMN "unavailable_at" TIMESTAMP(3);

UPDATE "connector_models"
SET "lifecycle" = 'SUNSET', "exposure" = 'UNEXPOSED'
WHERE "provider" = 'OPENAI'
  AND "lifecycle" = 'ACTIVE'
  AND (
    lower("model_key") ~ '-instruct(-|$)'
    OR lower("model_key") ~ '-search-preview(-|$)'
    OR lower("model_key") ~ '-chat-latest$'
    OR lower("model_key") ~ '-codex(-|$)'
    OR lower("model_key") = 'gpt-3.5-turbo-1106'
  );
