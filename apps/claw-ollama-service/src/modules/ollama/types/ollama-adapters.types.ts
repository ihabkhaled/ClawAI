export type OllamaModelDetail = {
  name: string;
  size: number;
  digest: string;
  details: {
    format: string;
    family: string;
    parameter_size: string;
    quantization_level: string;
  };
};

export type OllamaTagsResponse = {
  models: OllamaModelDetail[];
};

export type OllamaGenerateResponse = {
  model: string;
  created_at: string;
  response: string;
  done: boolean;
  total_duration?: number;
  load_duration?: number;
  prompt_eval_count?: number;
  eval_count?: number;
  eval_duration?: number;
};

export type OllamaPullResponse = {
  status: string;
  digest?: string;
  total?: number;
  completed?: number;
};
