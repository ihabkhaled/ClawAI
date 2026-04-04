export interface OllamaModel {
  name: string;
  modified_at: string;
  size: number;
  digest: string;
  details: {
    format: string;
    family: string;
    parameter_size: string;
    quantization_level: string;
  };
}

export interface OllamaModelsResponse {
  models: OllamaModel[];
}

export interface GenerateRequest {
  model: string;
  prompt: string;
  stream?: boolean;
  options?: Record<string, unknown>;
}

export interface GenerateResponse {
  model: string;
  created_at: string;
  response: string;
  done: boolean;
  total_duration?: number;
  load_duration?: number;
  prompt_eval_count?: number;
  eval_count?: number;
  eval_duration?: number;
}

export interface PullModelRequest {
  name: string;
  insecure?: boolean;
  stream?: boolean;
}

export interface PullModelResponse {
  status: string;
  digest?: string;
  total?: number;
  completed?: number;
}

export interface OllamaStatusResponse {
  connected: boolean;
  version?: string;
}
