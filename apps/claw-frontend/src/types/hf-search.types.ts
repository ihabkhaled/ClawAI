import type {
  HfCategoryChoice,
  HfQualityTierChoice,
  HfSearchSort,
} from '@/enums/hf-search.enum';
import type { FrontierCatalogEntry } from '@/types/local-frontier.types';

export type { HfCategoryChoice, HfQualityTierChoice, HfSearchSort };

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
  sort?: HfSearchSort;
  limit?: number;
}

export interface HfImportRequest {
  repo: string;
  quantization: string;
  category: HfCategoryChoice;
  qualityTier: HfQualityTierChoice;
}

export type HfImportResponse = FrontierCatalogEntry;

export interface HfSearchDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export interface HfResultsListProps {
  results: HfModelSummary[];
  isLoading: boolean;
  error: Error | null;
  selectedRepo: string | null;
  onSelect: (repo: string) => void;
}

export interface HfDetailsPanelProps {
  details: HfModelDetails | undefined;
  isLoading: boolean;
  selectedRepo: string | null;
  quantization: string;
  setQuantization: (q: string) => void;
  category: HfCategoryChoice;
  setCategory: (c: HfCategoryChoice) => void;
  qualityTier: HfQualityTierChoice;
  setQualityTier: (q: HfQualityTierChoice) => void;
}

export interface HfFieldProps {
  label: string;
  children: React.ReactNode;
}

export interface HfSearchDialogController {
  query: string;
  setQuery: (q: string) => void;
  sort: HfSearchSort;
  setSort: (s: HfSearchSort) => void;
  results: HfModelSummary[];
  isLoadingResults: boolean;
  resultsError: Error | null;
  selectedRepo: string | null;
  selectRepo: (repo: string | null) => void;
  details: HfModelDetails | undefined;
  isLoadingDetails: boolean;
  quantization: string;
  setQuantization: (q: string) => void;
  category: HfCategoryChoice;
  setCategory: (c: HfCategoryChoice) => void;
  qualityTier: HfQualityTierChoice;
  setQualityTier: (q: HfQualityTierChoice) => void;
  isImporting: boolean;
  importError: Error | null;
  submitImport: () => Promise<void>;
  resetSelection: () => void;
}
