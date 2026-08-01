export const OLLAMA_PROVIDER = 'local-ollama';

export const OLLAMA_CONNECTOR_PROVIDER = 'OLLAMA';

export const LLAMACPP_PROVIDER = 'local-llamacpp';

export const LLAMACPP_CONNECTOR_PROVIDER = 'LLAMACPP';

// Cloud provider identifiers used by the chat-execution dispatcher to opt
// individual providers into native request shapes (Anthropic Messages API,
// Gemini generateContent + Files API). Identical to the `provider` value
// that flows through MessageRoutedData.selectedProvider.
export const ANTHROPIC_PROVIDER = 'ANTHROPIC';

export const GEMINI_PROVIDER = 'GEMINI';

export const GEMINI_VIDEO_DEFAULT_MODEL = 'gemini-2.5-flash';

export const GEMINI_VIDEO_CAPABLE_MODELS = new Set([GEMINI_VIDEO_DEFAULT_MODEL, 'gemini-2.5-pro']);

export const GEMINI_OPENAI_COMPATIBILITY_SUFFIX = '/openai';

export const VIDEO_MIME_PREFIX = 'video/';

export const IMAGE_PROVIDER_PREFIX = 'IMAGE_';

export const FILE_GENERATION_PROVIDER = 'FILE_GENERATION';

export const THREAD_CONTEXT_LIMIT = 20;

export const MEMORY_FETCH_LIMIT = 20;

export const WORKSPACE_CONTEXT_LIMIT = 5;

export const APPROX_CHARS_PER_TOKEN = 4;

export const LOCAL_ONLY_ROUTING_MODES = new Set(['LOCAL_ONLY', 'PRIVACY_FIRST']);

// Connector provider tokens that may appear as the explicit `provider` half of a
// user-chosen judge model string ("PROVIDER:model"). Used by parseJudgeModel to
// recognize whether the leading segment is a real provider (so it is routed
// through callProvider) vs. part of the model name (e.g. "gpt-4o:latest").
// All compared case-insensitively against the upper-cased segment.
export const KNOWN_JUDGE_PROVIDERS = new Set([
  'OPENAI',
  'ANTHROPIC',
  'GEMINI',
  'AWS_BEDROCK',
  'DEEPSEEK',
  'GROK',
  OLLAMA_CONNECTOR_PROVIDER,
  LLAMACPP_CONNECTOR_PROVIDER,
  OLLAMA_PROVIDER,
  LLAMACPP_PROVIDER,
]);

export const PROVIDER_BASE_URLS: Record<string, string> = {
  OPENAI: 'https://api.openai.com/v1',
  GEMINI: 'https://generativelanguage.googleapis.com/v1beta/openai',
  DEEPSEEK: 'https://api.deepseek.com/v1',
  ANTHROPIC: 'https://api.anthropic.com/v1',
  GROK: 'https://api.x.ai/v1',
  OLLAMA: 'https://ollama.com/api',
  // LLAMACPP entries are reached via callLlamacpp() using LLAMACPP_SERVICE_URL,
  // not via the cloud provider base-URL flow. Listed here for documentation symmetry.
  LLAMACPP: 'http://llamacpp-service:4017/api/v1/v1',
};
