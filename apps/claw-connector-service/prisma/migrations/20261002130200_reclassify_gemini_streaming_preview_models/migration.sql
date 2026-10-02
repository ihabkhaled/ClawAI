-- Gemini "-streaming-preview" models (robotics-er streaming) speak only the
-- bidirectional WebSocket API (bidiGenerateContent); a chat request gets HTTP
-- 400 "only supports real-time bidirectional streaming". Live, realtime and
-- native-audio ids are covered by 20261002130100; this takes the one id shape
-- that migration's word list does not name. Idempotent: only CHAT rows move.
UPDATE "connector_models"
SET "kind" = 'TOOL', "exposure" = 'UNEXPOSED'
WHERE "kind" = 'CHAT'
  AND "model_key" ~* '-streaming-preview$';
