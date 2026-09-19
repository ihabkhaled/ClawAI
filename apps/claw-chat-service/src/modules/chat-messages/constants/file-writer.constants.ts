/**
 * The models that write an AI-generated file's content are an admin choice on
 * the Smart Router "Assistant models" tab (role FILE_WRITER), not code. They
 * were hard-coded (claude-sonnet-4, gpt-4o-mini, gemini-2.5-flash); when none
 * was exposed every file request failed with "The selected model is not
 * available" (production, 2026-09-19).
 */
export const FILE_WRITER_CANDIDATES_PATH =
  '/api/v1/internal/assistant-models/FILE_WRITER/candidates';

export const FILE_WRITER_CANDIDATES_TIMEOUT_MS = 3_000;

/** Reused this long, so an admin change lands within a minute without a restart. */
export const FILE_WRITER_CANDIDATES_TTL_MS = 60_000;

/** routing-service's name for hosted Ollama -> chat-service's provider for it. */
export const ROUTING_TO_CHAT_PROVIDER: Readonly<Record<string, string>> = {
  OLLAMA_CLOUD: 'OLLAMA',
  OLLAMA: 'local-ollama',
};
