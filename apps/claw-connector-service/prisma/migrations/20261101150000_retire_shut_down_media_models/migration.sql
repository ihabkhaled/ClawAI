-- Google shut these media models down (https://ai.google.dev/gemini-api/docs/deprecations, read
-- 2026-11-01): Veo 3.1 Lite / Fast / Standard on 2026-10-22 (replacement gemini-omni-1.1-flash),
-- and the Gemini 3.1 Flash Image / 3 Pro Image previews on 2026-06-25. Production QA showed Veo
-- answering VIDEO_MODEL_UNAVAILABLE while the picker still offered it, because the priced-media
-- policy (20261031150000, 20261101120000) kept priced rows ACTIVE and EXPOSED. They are now
-- REMOVED and UNEXPOSED; shared-utilities' isPricedMediaModel no longer counts them, so a sync
-- will not bring them back. Idempotent: a second run finds nothing left to change.
UPDATE "connector_models" cm
SET "lifecycle" = 'REMOVED',
    "exposure" = 'UNEXPOSED'
FROM "connectors" c
LEFT JOIN "connector_provider_definitions" pd ON pd."id" = c."provider_definition_id"
WHERE c."id" = cm."connector_id"
  AND (upper(COALESCE(pd."key", cm."provider"::text)) = 'GEMINI' OR cm."provider"::text = 'GEMINI')
  AND regexp_replace(cm."model_key", '^models/', '') IN (
    'veo-3.1-lite-generate-preview', 'veo-3.1-fast-generate-preview', 'veo-3.1-generate-preview',
    'veo-3.1-lite', 'veo-3.1-fast', 'veo-3.1-generate',
    'gemini-3.1-flash-image-preview', 'gemini-3-pro-image-preview')
  AND (cm."lifecycle" <> 'REMOVED' OR cm."exposure" <> 'UNEXPOSED');

-- The replacement video model is priced (routing seed v16) and exposed, like the other priced media.
UPDATE "connector_models" cm
SET "exposure" = 'EXPOSED',
    "lifecycle" = 'ACTIVE',
    "kind" = 'CHAT'::"ModelKind"
FROM "connectors" c
LEFT JOIN "connector_provider_definitions" pd ON pd."id" = c."provider_definition_id"
WHERE c."id" = cm."connector_id"
  AND c."is_enabled" = true
  AND (upper(COALESCE(pd."key", cm."provider"::text)) = 'GEMINI' OR cm."provider"::text = 'GEMINI')
  AND regexp_replace(cm."model_key", '^models/', '') = 'gemini-omni-1.1-flash'
  AND (cm."lifecycle" <> 'ACTIVE' OR cm."exposure" <> 'EXPOSED');
