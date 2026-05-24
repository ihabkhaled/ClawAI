export interface HfModelSummary {
  id: string;
  author: string | null;
  downloads: number;
  likes: number;
  lastModified: string | null;
  tags: string[];
  pipelineTag: string | null;
  gated: boolean;
  private: boolean;
}

export interface HfModelGgufFile {
  name: string;
  sizeBytes: number;
  quantization: string | null;
}

export interface HfModelDetails extends HfModelSummary {
  ggufFiles: HfModelGgufFile[];
  recommendedFile: HfModelGgufFile | null;
}

export interface HfSearchQuery {
  q?: string;
  sort?: 'trending' | 'downloads' | 'likes' | 'lastModified';
  limit?: number;
}

export interface HfAddRequest {
  repo: string;
  quantization: string;
  category: 'CODING' | 'GENERAL' | 'REASONING' | 'THINKING' | 'FILE_GENERATION';
  qualityTier: 'SURVIVAL' | 'BALANCED' | 'BEST';
}
