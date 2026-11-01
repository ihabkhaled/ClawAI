-- Media-generation models that routing-service's cost seed prices (v15 and earlier) are
-- offered by policy: they carry a cost class, so plan limits apply. Models without a price
-- stay hidden (unpriced = refused at the hold). The list mirrors
-- PRICED_MEDIA_MODEL_KEYS_BY_PROVIDER in @claw/shared-utilities; a routing-service spec keeps
-- it equal to the seed. Veo and Imagen were classified TOOL from Google's method list, so the
-- kind is repaired too (speech and music are AUDIO, the rest CHAT). Idempotent: only
-- UNEXPOSED, ACTIVE rows on enabled connectors change, and a second run changes nothing.
UPDATE "connector_models" cm
SET "exposure" = 'EXPOSED',
    "kind" = CASE
      WHEN regexp_replace(cm."model_key", '^models/', '') ~* '(^|[^a-z0-9])(tts|lyria|speech)([^a-z0-9]|$)|native-audio'
        THEN 'AUDIO'::"ModelKind"
      ELSE 'CHAT'::"ModelKind"
    END
FROM "connectors" c
WHERE cm."connector_id" = c."id"
  AND c."is_enabled" = true
  AND cm."lifecycle" = 'ACTIVE'
  AND cm."exposure" = 'UNEXPOSED'
  AND (
    (cm."provider"::text = 'GEMINI' AND regexp_replace(cm."model_key", '^models/', '') IN (
      'gemini-2.5-flash-image', 'gemini-3.1-flash-image-preview', 'gemini-3.1-flash-image',
      'gemini-3-pro-image-preview', 'gemini-3-pro-image', 'gemini-3.1-flash-lite-image',
      'nano-banana-pro-preview', 'veo-3.1-lite-generate-preview', 'veo-3.1-fast-generate-preview',
      'veo-3.1-generate-preview', 'veo-3.1-lite', 'veo-3.1-fast', 'veo-3.1-generate',
      'gemini-2.5-flash-preview-tts', 'gemini-2.5-pro-preview-tts', 'gemini-3.1-flash-tts-preview',
      'lyria-3-clip-preview', 'lyria-3-pro-preview', 'lyria-3.5'))
    OR (cm."provider"::text = 'OPENAI' AND cm."model_key" IN (
      'dall-e-2', 'dall-e-3', 'gpt-image-1', 'gpt-image-1-mini', 'gpt-image-1.5', 'gpt-image-2',
      'chatgpt-image-latest', 'tts-1', 'tts-1-hd', 'gpt-4o-mini-tts'))
    OR (cm."provider"::text = 'GROK' AND cm."model_key" IN (
      'grok-imagine-image', 'grok-imagine-image-quality', 'grok-imagine-image-2.0',
      'grok-imagine-video', 'grok-imagine-video-1.5'))
  );
