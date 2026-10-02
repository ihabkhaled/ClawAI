-- Gemini embedding and aqa models are not generateContent models, so pinning
-- one in chat 404s ("not found ... or is not supported for generateContent").
-- Sync now classifies them from supportedGenerationMethods; this brings the
-- rows that were synced before that existed to the same state.
-- Embedding models become EMBEDDING, aqa (generateAnswer only) becomes TOOL;
-- both are pulled out of the user-facing catalog.
UPDATE "connector_models"
SET "kind" = 'EMBEDDING', "exposure" = 'UNEXPOSED'
WHERE "provider" = 'GEMINI'
  AND "kind" = 'CHAT'
  AND LOWER("model_key") LIKE '%embedding%';

UPDATE "connector_models"
SET "kind" = 'TOOL', "exposure" = 'UNEXPOSED'
WHERE "provider" = 'GEMINI'
  AND "kind" = 'CHAT'
  AND LOWER("model_key") IN ('models/aqa', 'aqa');
