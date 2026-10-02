-- Models whose id says they are speech, realtime, embedding, reranker or
-- moderation/agent-only endpoints were synced as kind CHAT and EXPOSED, so the
-- picker offered them and chat completions answered 404 "not a chat model".
-- Reclassify them (same word-boundary rules as classifyModelKind in
-- connector-service) and unexpose them. Idempotent: only CHAT rows are touched.
UPDATE "connector_models"
SET "kind" = CASE
      WHEN "model_key" ~* '(^|[^a-z0-9])(embedding|embeddings|embed)([^a-z0-9]|$)' THEN 'EMBEDDING'::"ModelKind"
      WHEN "model_key" ~* '(^|[^a-z0-9])(rerank|reranker)([^a-z0-9]|$)' THEN 'RERANKER'::"ModelKind"
      WHEN "model_key" ~* '(^|[^a-z0-9])(tts|transcribe|transcription|diarize|whisper|realtime|live|lyria|speech)([^a-z0-9]|$)|native-audio' THEN 'AUDIO'::"ModelKind"
      ELSE 'TOOL'::"ModelKind"
    END,
    "exposure" = 'UNEXPOSED'
WHERE "kind" = 'CHAT'
  AND (
    "model_key" ~* '(^|[^a-z0-9])(embedding|embeddings|embed)([^a-z0-9]|$)'
    OR "model_key" ~* '(^|[^a-z0-9])(rerank|reranker)([^a-z0-9]|$)'
    OR "model_key" ~* '(^|[^a-z0-9])(tts|transcribe|transcription|diarize|whisper|realtime|live|lyria|speech)([^a-z0-9]|$)|native-audio'
    OR "model_key" ~* '(^|[^a-z0-9])(moderation|computer-use|deep-research|aqa|multi-agent)([^a-z0-9]|$)'
  );
