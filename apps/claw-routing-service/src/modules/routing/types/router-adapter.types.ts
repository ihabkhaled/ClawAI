/** What connector-service returns for a provider's credentials. */
export interface ConnectorCredential {
  provider: string;
  apiKey: string;
  baseUrl: string | null;
}

/** A cached credential plus the moment it stops being trusted. */
export interface CachedCredential {
  credential: ConnectorCredential;
  expiresAt: number;
}

/** OpenAI-compatible chat completion response, as Gemini's compat layer returns it. */
export interface OpenAiCompatibleResponse {
  choices?: Array<{ message?: { content?: string | null } | null } | null> | null;
  usage?: {
    prompt_tokens?: number | null;
    completion_tokens?: number | null;
  } | null;
}

/** Ollama's native /chat response. */
export interface OllamaChatResponse {
  message?: { content?: string | null } | null;
  prompt_eval_count?: number | null;
  eval_count?: number | null;
}

/** ollama-service's /generate proxy response, used by the legacy local adapter. */
export interface OllamaGenerateProxyResponse {
  response: string;
  prompt_eval_count?: number | null;
  eval_count?: number | null;
}
