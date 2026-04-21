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
