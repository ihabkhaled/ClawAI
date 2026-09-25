-- The voice model that reads an assistant reply aloud (text-to-speech,
-- multimodal batch 9), metered on PaygSurface.TTS. Seeded rows come from
-- AssistantModelService.onModuleInit (fills a role only while it has no rows).
ALTER TYPE "AssistantModelRole" ADD VALUE IF NOT EXISTS 'TTS_VOICE';
