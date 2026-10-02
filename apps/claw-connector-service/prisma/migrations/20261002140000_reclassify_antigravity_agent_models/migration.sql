-- Gemini Antigravity models are tool-driven agents, not plain chat models, so a
-- chat turn pinned to one cannot be answered. Same rule as the sync classifier
-- (nonChatKindForModelKey): kind TOOL keeps them out of the catalog, the picker
-- and routing; exposure goes back to UNEXPOSED. Idempotent: only CHAT rows move.
-- Speech, music, deep-research and computer-use ids are covered by
-- 20261002130100_reclassify_speech_and_embedding_models.
UPDATE "connector_models"
SET "kind" = 'TOOL', "exposure" = 'UNEXPOSED'
WHERE "kind" = 'CHAT'
  AND "model_key" ~* '(^|[^a-z0-9])antigravity([^a-z0-9]|$)';
