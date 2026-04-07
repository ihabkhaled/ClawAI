export const OLLAMA_PROVIDER = "local-ollama";

export const THREAD_CONTEXT_LIMIT = 20;

export const MEMORY_FETCH_LIMIT = 20;

export const APPROX_CHARS_PER_TOKEN = 4;

export const PROVIDER_BASE_URLS: Record<string, string> = {
  OPENAI: "https://api.openai.com/v1",
  GEMINI: "https://generativelanguage.googleapis.com/v1beta/openai",
  DEEPSEEK: "https://api.deepseek.com/v1",
  ANTHROPIC: "https://api.anthropic.com/v1",
};
