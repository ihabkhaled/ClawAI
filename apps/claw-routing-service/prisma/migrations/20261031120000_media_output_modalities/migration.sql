-- Media generation models were stored with EMPTY modalities_out because the
-- connector snapshot hard-coded TEXT and sync wrote nothing media-shaped.
-- Backfill the output modality from the model id (same shapes as the shared
-- classifier in @claw/shared-utilities media-output-model), and add the xAI
-- Grok Imagine models the connector catalog does not list. Idempotent.

-- Image
UPDATE "router_model_registry"
SET "modalities_out" = ARRAY['IMAGE_OUTPUT']::"ModalityKind"[]
WHERE "lifecycle" <> 'REMOVED'
  AND NOT ("modalities_out" @> ARRAY['IMAGE_OUTPUT']::"ModalityKind"[])
  AND (
    ("provider" = 'GEMINI' AND "model_key" ~* '^(models/)?(gemini-[a-z0-9._-]*-image[a-z0-9._-]*|imagen-[a-z0-9._-]+|nano-banana[a-z0-9._-]*)$')
    OR ("provider" = 'GROK' AND "model_key" ~* '^(grok-imagine-image[a-z0-9._-]*|grok-2-image[a-z0-9._-]*)$')
    OR ("provider" = 'OPENAI' AND "model_key" ~* '^(gpt-image[a-z0-9._-]*|dall-e-[0-9][a-z0-9._-]*|chatgpt-image[a-z0-9._-]*)$')
  );

-- Video
UPDATE "router_model_registry"
SET "modalities_out" = ARRAY['VIDEO_OUTPUT']::"ModalityKind"[]
WHERE "lifecycle" <> 'REMOVED'
  AND NOT ("modalities_out" @> ARRAY['VIDEO_OUTPUT']::"ModalityKind"[])
  AND (
    ("provider" = 'GEMINI' AND "model_key" ~* '^(models/)?veo-[a-z0-9._-]+$')
    OR ("provider" = 'GROK' AND "model_key" ~* '^grok-imagine-video[a-z0-9._-]*$')
  );

-- Audio (speech, native audio, music): any provider
UPDATE "router_model_registry"
SET "modalities_out" = ARRAY['AUDIO_OUTPUT']::"ModalityKind"[]
WHERE "lifecycle" <> 'REMOVED'
  AND NOT ("modalities_out" @> ARRAY['AUDIO_OUTPUT']::"ModalityKind"[])
  AND "model_key" ~* '(^|[/_.:-])(tts|text-to-speech|native-audio|speech|lyria|music|musicgen)([_.:-]|$)';

-- xAI Grok Imagine models (registry provider key is GROK). Prices live in
-- model_costs, not here.
INSERT INTO "router_model_registry"
  ("id", "provider", "model_key", "display_name", "family", "modalities_in", "modalities_out",
   "lifecycle", "metadata_source", "updated_at")
SELECT gen_random_uuid()::text, 'GROK', v.model_key, v.display_name, 'grok-imagine',
       ARRAY['TEXT']::"ModalityKind"[], ARRAY[v.modality]::"ModalityKind"[],
       'ACTIVE', 'seed', CURRENT_TIMESTAMP
FROM (VALUES
  ('grok-imagine-image', 'Grok Imagine Image', 'IMAGE_OUTPUT'),
  ('grok-imagine-image-quality', 'Grok Imagine Image (Quality)', 'IMAGE_OUTPUT'),
  ('grok-imagine-image-2.0', 'Grok Imagine Image 2.0', 'IMAGE_OUTPUT'),
  ('grok-imagine-video', 'Grok Imagine Video', 'VIDEO_OUTPUT'),
  ('grok-imagine-video-1.5', 'Grok Imagine Video 1.5', 'VIDEO_OUTPUT')
) AS v(model_key, display_name, modality)
ON CONFLICT ("provider", "model_key") DO NOTHING;
