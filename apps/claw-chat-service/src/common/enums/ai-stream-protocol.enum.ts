// The wire format a provider stream was read with. ClawAI routes all cloud
// providers through an OpenAI-compatible endpoint (OPENAI_SSE) and local
// Ollama through native NDJSON. SIMULATED = provider could not stream, so the
// full response was chunked client-side after arrival (progress is estimated).
export enum AiStreamProtocol {
  OPENAI_SSE = 'openai_sse',
  OLLAMA_NDJSON = 'ollama_ndjson',
  SIMULATED = 'simulated',
}
