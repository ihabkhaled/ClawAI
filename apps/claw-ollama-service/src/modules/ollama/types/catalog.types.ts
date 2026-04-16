import type {
  ModelCatalogEntry,
  ModelCategory,
  PullJobStatus,
  RuntimeType,
} from '../../../generated/prisma';

export type CatalogEntryInput = {
  name: string;
  tag: string;
  displayName: string;
  category: string;
  description?: string;
  sizeBytes?: bigint;
  parameterCount?: string;
  runtime: string;
  ollamaName?: string | null;
  sourceUrl?: string | null;
  isRecommended: boolean;
  capabilities: readonly string[];
};

export type CatalogFilters = {
  category?: ModelCategory;
  runtime?: RuntimeType;
  search?: string;
};

export type CatalogEntryWithInstallStatus = ModelCatalogEntry & {
  isInstalled: boolean;
  installedModelId: string | null;
  pullJobStatus: PullJobStatus | null;
  sourceUrl: string | null;
  isAvailable: boolean;
  isDownloadable: boolean;
  availabilityError: string | null;
};

export type InstalledModelInfo = {
  id: string;
  name: string;
  tag: string;
  category: string | null;
  roles: string[];
  capabilities: string[];
  parameterCount: string | null;
  sizeBytes: bigint | null;
};

export type InstalledModelsApiResponse = {
  models: InstalledModelInfo[];
};
