// Providers known to accept native image parts (image_url / inline_data /
// images: base64). Used as a heuristic classifier when the connector model's
// supportsVision flag is unavailable. NOT exhaustive — falls back to false.
//
// FALLBACK ONLY: this provider-level allow-list is used by file-delivery.utility
// when per-model `ModelMetadata.supportsVision` is not supplied by the caller.
// Per-model metadata is the authoritative source of truth and should be
// preferred whenever available — see file-delivery.utility#resolveSupportsVision.
export const VISION_CAPABLE_PROVIDERS = new Set([
  'OPENAI',
  'ANTHROPIC',
  'GEMINI',
  'AWS_BEDROCK',
  // Bedrock hosts Claude 3/3.5/3.7 + Nova Lite/Pro, all of which accept
  // OpenAI-compatible image_url parts when routed through the existing
  // OpenAI-compat passthrough. Per-model `supportsVision` from the connector
  // catalog is still preferred; this entry is the heuristic fallback only.
  'GROK',
  // Grok 2 Vision + Grok 4 family accept OpenAI-style image_url parts on
  // the same /v1/chat/completions endpoint. Text-only Grok models (grok-2,
  // grok-2-mini, grok-3) will be filtered by per-model `supportsVision` when
  // the connector catalog metadata is threaded through.
  'DEEPSEEK',
  // DeepSeek's vision models (deepseek-vl, deepseek-vl2) speak OpenAI-compat
  // image_url. deepseek-chat / deepseek-reasoner are text-only and will be
  // filtered by per-model `supportsVision` from the connector catalog.
  'LLAMACPP',
  'local-llamacpp',
  // OLLAMA / local-ollama only when running a multimodal local model; we let
  // the chat-execution layer's images[] path handle it and classify NATIVE.
  'OLLAMA',
  'local-ollama',
]);

// Mime-type prefixes/exact matches that are treated as text the LLM can
// understand when injected into the prompt. Anything else → OMITTED_UNSUPPORTED.
export const TEXT_LIKE_MIME_PREFIXES = ['text/'];
export const TEXT_LIKE_MIME_EXACT = new Set([
  'application/json',
  'application/xml',
  'application/csv',
  'application/x-yaml',
  'application/x-ndjson',
  'application/javascript',
  'application/typescript',
  'application/sql',
]);

export const IMAGE_MIME_PREFIX = 'image/';
