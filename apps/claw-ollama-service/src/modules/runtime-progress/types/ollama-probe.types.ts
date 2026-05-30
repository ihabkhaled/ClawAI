export type OllamaVersionResponse = {
  version: string;
};

export type OllamaTagModelDetails = {
  format?: string;
  family?: string;
  parameter_size?: string;
  quantization_level?: string;
};

export type OllamaTagModel = {
  name: string;
  size?: number;
  digest?: string;
  details?: OllamaTagModelDetails;
};

export type OllamaTagsResponse = {
  models?: OllamaTagModel[];
};

export type OllamaPsModel = {
  name: string;
  size?: number;
  digest?: string;
  details?: OllamaTagModelDetails;
  expires_at?: string;
  size_vram?: number;
};

export type OllamaPsResponse = {
  models?: OllamaPsModel[];
};
