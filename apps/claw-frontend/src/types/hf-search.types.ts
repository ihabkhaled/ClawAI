import type { FrontierCatalogEntry } from '@/types/local-frontier.types';

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

export type HfSearchSort = 'trending' | 'downloads' | 'likes' | 'lastModified';

export interface HfSearchQuery {
  q?: string;
  sort?: HfSearchSort;
  limit?: number;
}

export type HfCategoryChoice =
  | 'CODING'
  | 'GENERAL'
  | 'REASONING'
  | 'THINKING'
  | 'FILE_GENERATION';

export type HfQualityTierChoice = 'SURVIVAL' | 'BALANCED' | 'BEST';

export interface HfImportRequest {
  repo: string;
  quantization: string;
  category: HfCategoryChoice;
  qualityTier: HfQualityTierChoice;
}

export type HfImportResponse = FrontierCatalogEntry;
