-- A speech/realtime model (tts, transcribe, whisper, live, native-audio) is not a
-- chat model. Its own kind keeps it out of the chat picker and the router. The
-- value is only USED by the next migration: PostgreSQL does not let a value added
-- in a transaction be used in that same transaction.
ALTER TYPE "ModelKind" ADD VALUE IF NOT EXISTS 'AUDIO';
