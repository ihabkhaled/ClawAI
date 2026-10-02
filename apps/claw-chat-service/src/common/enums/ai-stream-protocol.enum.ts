// The wire format a provider stream was read with. ClawAI routes most cloud
// providers through an OpenAI-compatible endpoint (OPENAI_SSE) and local
// Ollama through native NDJSON. ANTHROPIC_SSE is Anthropic's own Messages
// stream, used only when an administrator switched prompt caching on for the
// model (F093). SIMULATED = provider could not stream, so the full response was
// chunked client-side after arrival (progress is estimated).
export enum AiStreamProtocol {
  OPENAI_SSE = 'openai_sse',
  OLLAMA_NDJSON = 'ollama_ndjson',
  ANTHROPIC_SSE = 'anthropic_sse',
  SIMULATED = 'simulated',
}
