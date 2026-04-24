import type {
  DownloadStatus,
  ModelCatalogEntry,
  ModelCategory,
  PullJobStatus,
  RuntimeType,
} from '../../../generated/prisma';
import type { ModelCapability } from '../../../common/enums/model-capability.enum';

export type CatalogEntryInput = {
  name: string;
  tag: string;
  displayName: string;
  category: string;
  description?: string;
  sizeBytes?: bigint | null;
  parameterCount?: string | null;
  runtime: RuntimeType;
  ollamaName?: string | null;
  sourceUrl?: string | null;
  isRecommended: boolean;
  capabilities: readonly string[];
  businessCategories?: readonly string[];
  hardwareProfiles?: readonly string[];
};

export type PreparedCatalogEntryInput = CatalogEntryInput & {
  sizeBytes: bigint | null;
  businessCategories: string[];
  hardwareProfiles: string[];
};

export type CatalogFilters = {
  category?: ModelCategory;
  runtime?: RuntimeType;
  downloadStatus?: DownloadStatus;
  search?: string;
  capability?: ModelCapability;
  searchBrowserMinScore?: number;
  onlySearchBrowser?: boolean;
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
