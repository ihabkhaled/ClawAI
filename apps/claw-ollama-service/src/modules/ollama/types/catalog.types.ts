import type {
  LocalModelRoleAssignment,
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
  pullJobStatus: PullJobStatus | null;
};

export type InstalledModelInfo = {
  id: string;
  name: string;
  tag: string;
  category: ModelCategory | null;
  roles: LocalModelRoleAssignment[];
  capabilities: string[];
  parameterCount: string | null;
  sizeBytes: bigint | null;
};
