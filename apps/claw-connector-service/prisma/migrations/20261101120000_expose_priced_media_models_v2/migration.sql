-- Follow-up to 20261031150000_expose_priced_media_models (left untouched). Production QA
-- (v1.226.0) still had priced media models UNEXPOSED: Veo x3 (kind TOOL, `models/` prefix),
-- chatgpt-image-latest and the dated gpt-4o-mini-tts-2025-03-20 / -2025-12-15 ids. This pass
-- matches (a) the provider by EITHER the connector's provider enum OR its provider definition
-- key, (b) the key with the `models/` prefix stripped, and (c) the key with a trailing date
-- (-YYYY-MM-DD or -YYYYMMDD) stripped, so a dated snapshot of a priced model is the same model.
-- Kind is repaired (speech/music -> AUDIO, everything else -> CHAT, so Veo leaves TOOL).
-- Production showed Veo x3 and chatgpt-image-latest as lifecycle REMOVED (the provider list omits
-- models that still work, and an earlier sync marked them gone), so REMOVED rows of the priced
-- list come back ACTIVE too. Unpriced ids (gemini-3.8-flash-tts, lyria-realtime-exp, OpenRouter lyria) are not in the list
-- and stay hidden. Idempotent: only UNEXPOSED-ACTIVE or REMOVED rows on enabled connectors change; a second run finds none.
WITH rows AS (
  SELECT cm."id",
         upper(COALESCE(pd."key", cm."provider"::text)) AS provider_key,
         cm."provider"::text AS provider_enum,
         regexp_replace(cm."model_key", '^models/', '') AS plain_key,
         regexp_replace(regexp_replace(cm."model_key", '^models/', ''),
                        '-([0-9]{4}-[0-9]{2}-[0-9]{2}|[0-9]{8})$', '') AS undated_key
  FROM "connector_models" cm
  JOIN "connectors" c ON c."id" = cm."connector_id"
  LEFT JOIN "connector_provider_definitions" pd ON pd."id" = c."provider_definition_id"
  WHERE c."is_enabled" = true
    AND (cm."lifecycle" = 'REMOVED' OR (cm."lifecycle" = 'ACTIVE' AND cm."exposure" = 'UNEXPOSED'))
)
UPDATE "connector_models" cm
SET "exposure" = 'EXPOSED',
    "lifecycle" = 'ACTIVE',
    "kind" = CASE
      WHEN r.undated_key ~* '(^|[^a-z0-9])(tts|lyria|speech)([^a-z0-9]|$)|native-audio'
        THEN 'AUDIO'::"ModelKind"
      ELSE 'CHAT'::"ModelKind"
    END
FROM rows r
WHERE cm."id" = r."id"
  AND (
    (r.provider_key = 'GEMINI' OR r.provider_enum = 'GEMINI') AND (
      r.plain_key IN (
        'gemini-2.5-flash-image', 'gemini-3.1-flash-image-preview', 'gemini-3.1-flash-image',
        'gemini-3-pro-image-preview', 'gemini-3-pro-image', 'gemini-3.1-flash-lite-image',
        'nano-banana-pro-preview', 'veo-3.1-lite-generate-preview', 'veo-3.1-fast-generate-preview',
        'veo-3.1-generate-preview', 'veo-3.1-lite', 'veo-3.1-fast', 'veo-3.1-generate',
        'gemini-2.5-flash-preview-tts', 'gemini-2.5-pro-preview-tts', 'gemini-3.1-flash-tts-preview',
        'lyria-3-clip-preview', 'lyria-3-pro-preview', 'lyria-3.5')
      OR r.undated_key IN (
        'gemini-2.5-flash-image', 'gemini-3.1-flash-image-preview', 'gemini-3-pro-image-preview',
        'gemini-2.5-flash-preview-tts', 'gemini-2.5-pro-preview-tts', 'gemini-3.1-flash-tts-preview'))
    OR (r.provider_key = 'OPENAI' OR r.provider_enum = 'OPENAI') AND (
      r.plain_key IN (
        'dall-e-2', 'dall-e-3', 'gpt-image-1', 'gpt-image-1-mini', 'gpt-image-1.5', 'gpt-image-2',
        'chatgpt-image-latest', 'tts-1', 'tts-1-hd', 'gpt-4o-mini-tts')
      OR r.undated_key IN (
        'gpt-image-1', 'gpt-image-1-mini', 'gpt-image-1.5', 'gpt-image-2', 'tts-1', 'tts-1-hd',
        'gpt-4o-mini-tts'))
    OR (r.provider_key = 'GROK' OR r.provider_enum = 'GROK') AND r.plain_key IN (
      'grok-imagine-image', 'grok-imagine-image-quality', 'grok-imagine-image-2.0',
      'grok-imagine-video', 'grok-imagine-video-1.5')
  );
