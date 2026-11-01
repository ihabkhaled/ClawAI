/**
 * Providers that speak a native tool-calling dialect (OpenAI, Anthropic or Ollama wire
 * shape). Mirrors the keys of chat-service's `PROVIDER_TOOL_DIALECT_BY_PROVIDER`; a
 * provider listed there but not here (or the reverse) makes routing and the tool loop
 * disagree about whether a picked model can call a media tool.
 */
export const TOOL_DIALECT_PROVIDERS: ReadonlySet<string> = new Set([
  'OPENAI',
  'GEMINI',
  'DEEPSEEK',
  'GROK',
  'LLAMACPP',
  'local-llamacpp',
  'ANTHROPIC',
  'AWS_BEDROCK',
  'OLLAMA',
  'local-ollama',
]);

/**
 * Providers with a tool dialect whose models are NOT offered the media tools. Ollama (cloud and
 * local) models answer in their own text tool format (kimi-k2.6:cloud printed a literal
 * `<function_calls>` block), so a media request on them keeps the router-side redirect.
 */
export const MEDIA_TOOL_EXCLUDED_PROVIDERS: ReadonlySet<string> = new Set([
  'OLLAMA',
  'local-ollama',
]);

/** Ids that are not a plain chat turn: embeddings, rerankers, moderation, speech in, realtime, agent-only endpoints. */
export const NON_CHAT_TOOL_MODEL_PATTERN =
  /(?:^|[^a-z0-9])(?:embedding|embeddings|embed|rerank|reranker|moderation|whisper|transcribe|transcription|diarize|realtime|live|computer-use|deep-research|multi-agent|aqa)(?:[^a-z0-9]|$)|native-audio/iu;
