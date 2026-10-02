import { ModelKind } from '../../../generated/prisma';

/**
 * Id keywords that mark a synced model as something other than a text-chat
 * deployment. Matched on word boundaries (any non-alphanumeric character), so
 * `gpt-4o-mini-tts-2025-03-20` and `gemini-2.5-flash-native-audio` match while
 * `gpt-4o-audio-preview` (a real chat-completions model) does not.
 *
 * ONE place, used at sync time by `nonChatKindForModelKey`. Providers list
 * speech, realtime, embedding and agent-only models next to chat models
 * without a reliable type field, and nothing set `kind`, so every one of them
 * was offered in the chat picker and answered 404 "not a chat model" (ADR-151).
 */
export const MODEL_KIND_EMBEDDING_PATTERN =
  /(?:^|[^a-z0-9])(?:embedding|embeddings|embed)(?:[^a-z0-9]|$)/iu;

export const MODEL_KIND_RERANKER_PATTERN = /(?:^|[^a-z0-9])(?:rerank|reranker)(?:[^a-z0-9]|$)/iu;

/** Speech in or out, realtime/live audio sessions and music generation. */
export const MODEL_KIND_AUDIO_PATTERN =
  /(?:^|[^a-z0-9])(?:tts|transcribe|transcription|diarize|whisper|realtime|live|lyria|speech)(?:[^a-z0-9]|$)|native-audio/iu;

/**
 * Endpoints that are not a plain chat turn: moderation, computer-use,
 * deep-research, Antigravity (an agent), attributed QA, and xAI multi-agent (/v1/responses only).
 * `-streaming-preview` is Gemini's WebSocket-only robotics stream
 * (bidiGenerateContent): chat gets HTTP 400 "only supports real-time
 * bidirectional streaming".
 */
export const MODEL_KIND_TOOL_PATTERN =
  /(?:^|[^a-z0-9])(?:moderation|computer-use|deep-research|antigravity|aqa|multi-agent)(?:[^a-z0-9]|$)|-streaming-preview$/iu;

/** First match wins. */
export const NON_CHAT_KIND_RULES: ReadonlyArray<readonly [RegExp, ModelKind]> = [
  [MODEL_KIND_EMBEDDING_PATTERN, ModelKind.EMBEDDING],
  [MODEL_KIND_RERANKER_PATTERN, ModelKind.RERANKER],
  [MODEL_KIND_AUDIO_PATTERN, ModelKind.AUDIO],
  [MODEL_KIND_TOOL_PATTERN, ModelKind.TOOL],
];
