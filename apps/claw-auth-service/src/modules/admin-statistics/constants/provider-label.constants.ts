/** Matches every run of non-alphanumerics, mirroring the SQL `regexp_replace`. */
export const PROVIDER_NON_ALNUM_PATTERN = /[^A-Za-z0-9]+/g;

export const PROVIDER_UNKNOWN_KEY = 'UNKNOWN';

/** Normalised provider key to display label. Keys not listed are title-cased. */
export const PROVIDER_LABELS: Readonly<Record<string, string>> = {
  OPENAI: 'OpenAI',
  ANTHROPIC: 'Anthropic',
  GEMINI: 'Google Gemini',
  AWS_BEDROCK: 'AWS Bedrock',
  DEEPSEEK: 'DeepSeek',
  OLLAMA: 'Ollama',
  LOCAL_OLLAMA: 'Local Ollama',
  OLLAMA_CLOUD: 'Ollama Cloud',
  GROK: 'xAI Grok',
  LLAMACPP: 'llama.cpp (local)',
  OPENROUTER: 'OpenRouter',
  GROQ: 'Groq',
  ZAI: 'Z.ai',
  CUSTOM_OPENAI_COMPATIBLE: 'Custom (OpenAI-compatible)',
  CLAW: 'ClawAI (platform)',
};
