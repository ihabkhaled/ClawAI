/** OpenAI-compatible /v1/models response (also used by DeepSeek) */
export type OpenAIModelsResponse = {
  object: string;
  data: OpenAIModelEntry[];
};

export type OpenAIModelEntry = {
  id: string;
  object: string;
  created: number;
  owned_by: string;
};

/** Anthropic /v1/models response */
export type AnthropicModelsResponse = {
  data: AnthropicModelEntry[];
  has_more: boolean;
  first_id: string | null;
  last_id: string | null;
};

export type AnthropicModelEntry = {
  type: string;
  id: string;
  display_name: string;
  created_at: string;
};

/** Grok/xAI OpenAI-compatible /v1/models response */
export type GrokModelsResponse = {
  object: string;
  data: GrokModelEntry[];
};

export type GrokModelEntry = {
  id: string;
  object: string;
  created: number;
  owned_by: string;
};

/** Gemini OpenAI-compatible /models response */
export type GeminiModelsResponse = {
  object: string;
  data: GeminiModelEntry[];
};

export type GeminiModelEntry = {
  id: string;
  object: string;
  created: number;
  owned_by: string;
};

/** Ollama /api/tags response */
export type OllamaModelsResponse = {
  models: OllamaModelEntry[];
};

export type OllamaModelEntry = {
  name: string;
  model: string;
  modified_at: string;
  size: number;
  digest: string;
  details?: {
    family?: string;
    parameter_size?: string;
    quantization_level?: string;
  };
};

// Minimal slice of a native Ollama /api/chat response — only what the tool
// probe reads. Deliberately narrow: the probe is a yes/no mechanical check and
// has no business depending on the rest of the payload.
export interface OllamaProbeChatResponse {
  message?: {
    content?: string;
    tool_calls?: Array<{ function?: { name?: string } }>;
  };
}
