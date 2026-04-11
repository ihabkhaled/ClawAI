import type { PaginationMeta } from './audit.types';
import type { TranslateFunction } from './i18n.types';

export type ModelCatalogEntry = {
  id: string;
  name: string;
  tag: string;
  displayName: string;
  category: string;
  description: string | null;
  sizeBytes: number | null;
  parameterCount: string | null;
  runtime: string;
  ollamaName: string | null;
  isRecommended: boolean;
  capabilities: string[];
  isInstalled: boolean;
  installedModelId: string | null;
  pullJobStatus: string | null;
};

export type CatalogListResponse = {
  data: ModelCatalogEntry[];
  meta: PaginationMeta;
};

export type PullFromCatalogResponse = {
  pullJobId: string;
};

export type PullJobResponse = {
  id: string;
  modelName: string;
  runtime: string;
  status: string;
  progress: number | null;
  totalBytes: number | null;
  downloadedBytes: number | null;
  errorMessage: string | null;
  startedAt: string;
  completedAt: string | null;
};

export type DownloadStats = {
  speedBytesPerSec: number;
  elapsedMs: number;
  estimatedRemainingMs: number | null;
};

export type DownloadSnapshotEntry = {
  downloadedBytes: number;
  timestamp: number;
};

export type DownloadSnapshotMap = Map<string, DownloadSnapshotEntry>;

export type CatalogFilterParams = {
  category?: string;
  search?: string;
  page?: number;
  limit?: number;
};

export type UseModelCatalogPageReturn = {
  t: TranslateFunction;
  entries: ModelCatalogEntry[];
  meta: PaginationMeta;
  isLoading: boolean;
  isError: boolean;
  category: string | undefined;
  search: string;
  pullJobs: PullJobResponse[];
  isPullJobsLoading: boolean;
  hasActiveJobs: boolean;
  downloadStatsMap: Map<string, DownloadStats>;
  handleCategoryChange: (value: string | undefined) => void;
  handleSearchChange: (value: string) => void;
  handlePull: (catalogId: string) => void;
  handleCancelJob: (jobId: string) => void;
  handleDelete: (modelId: string) => void;
  isPullPending: boolean;
  isCancelPending: boolean;
  isDeletePending: boolean;
  getJobForModel: (modelName: string) => PullJobResponse | undefined;
};
