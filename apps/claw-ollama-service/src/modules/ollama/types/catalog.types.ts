import type {
  ModelCatalogEntry,
  ModelCategory,
  PullJobStatus,
  RuntimeType,
} from '../../../generated/prisma';

export type CatalogFilters = {
  category?: ModelCategory;
  runtime?: RuntimeType;
  search?: string;
};

export type CatalogEntryWithInstallStatus = ModelCatalogEntry & {
  isInstalled: boolean;
  installedModelId: string | null;
  pullJobStatus: PullJobStatus | null;
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
