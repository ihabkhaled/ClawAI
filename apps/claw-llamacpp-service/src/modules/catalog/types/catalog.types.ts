import {
  type DownloadStatus,
  type LoadStatus,
  type ModelCategory,
  type QualityTier,
} from '../../../common/enums';

export interface CatalogEntry {
  id: string;
  name: string;
  tag: string;
  displayName: string;
  category: ModelCategory;
  description: string;
  parameterCount: string;
  totalParamsB: number;
  activeParamsB: number;
  contextLength: number;
  capabilities: string[];
  license: string;
  huggingfaceRepo: string;
  filePattern: string;
  manifestSha256: string | null;
  fileSizeBytes: bigint;
  requiredRamGb: number;
  recommendedRamGb: number;
  requiredDiskGb: number;
  recommendedGpuVramGb: number;
  isRecommended: boolean;
  qualityTier: QualityTier;
  sourceUrl: string;
  chatTemplate: string | null;
  available: boolean;
  downloadStatus: DownloadStatus;
  loadStatus: LoadStatus;
  createdAt: Date;
  updatedAt: Date;
}

export interface CatalogListFilters {
  category?: ModelCategory;
  qualityTier?: QualityTier;
  compatibleOnly?: boolean;
  limit?: number;
  cursor?: string;
  search?: string;
}

export interface CatalogListResult {
  data: CatalogEntry[];
  total: number;
  nextCursor: string | null;
}

export interface RoutingSnapshotEntry {
  provider: string;
  modelKey: string;
  displayName: string;
  family?: string;
  isLocal: boolean;
  modalitiesIn: string[];
  modalitiesOut: string[];
  contextWindowTokens?: number;
}

export interface RoutingSnapshotResult {
  models: RoutingSnapshotEntry[];
  generatedAt: string;
}
