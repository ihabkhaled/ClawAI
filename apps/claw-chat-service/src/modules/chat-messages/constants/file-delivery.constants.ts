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
  'GROK',
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
