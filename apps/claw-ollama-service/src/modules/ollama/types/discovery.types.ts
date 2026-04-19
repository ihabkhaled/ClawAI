import type {
  CandidateStatus,
  DiscoveryRunStatus,
  DiscoverySource,
  DiscoverySourceType,
  DownloadStatus,
  ModelCategory,
  ModelDiscoveryCandidate,
  ModelDiscoveryRun,
  RuntimeType,
} from '../../../generated/prisma';

export type DiscoverySourcePublic = DiscoverySource;

export type DiscoveryRunPublic = ModelDiscoveryRun;

export type DiscoveryRunWithCounts = ModelDiscoveryRun & {
  source: DiscoverySource;
};

export type CandidatePublic = ModelDiscoveryCandidate;

export type DiscoveredModel = {
  name: string;
  tag: string;
  displayName: string;
  ollamaName: string;
  description: string | null;
  sizeBytes: bigint | null;
  parameterCount: string | null;
  familyName: string | null;
  runtime: RuntimeType;
  capabilities: string[];
  sourceUrl: string | null;
  downloadStatus: DownloadStatus;
};

export type ClassifiedModel = DiscoveredModel & {
  suggestedCategory: ModelCategory;
  businessCategories: string[];
  hardwareProfiles: string[];
  confidence: number;
};

export type CandidateFilter = {
  status?: CandidateStatus;
  runId?: string;
  category?: ModelCategory;
  downloadStatus?: DownloadStatus;
  search?: string;
  page: number;
  pageSize: number;
};

export type RunFilter = {
  sourceId?: string;
  status?: DiscoveryRunStatus;
  page: number;
  pageSize: number;
};

export type PaginatedCandidates = {
  data: CandidatePublic[];
  total: number;
  page: number;
  pageSize: number;
};

export type PaginatedRuns = {
  data: DiscoveryRunWithCounts[];
  total: number;
  page: number;
  pageSize: number;
};

export type DiscoveryTriggerInput = {
  sourceId?: string;
  isDryRun: boolean;
  triggeredBy: string;
};

export type DiscoveryTriggerResult = {
  runId: string;
  status: DiscoveryRunStatus;
};

export type CreateSourceInput = {
  name: string;
  type: DiscoverySourceType;
  baseUrl: string;
  isEnabled: boolean;
  categories: string[];
  maxResults: number;
  minQuality: number;
};

export type UpdateSourceInput = Partial<CreateSourceInput>;

export type ApproveCandidateInput = {
  candidateId: string;
  overrides?: {
    displayName?: string;
    category?: ModelCategory;
    businessCategories?: string[];
    hardwareProfiles?: string[];
    description?: string;
    isRecommended?: boolean;
  };
};

export type RejectCandidateInput = {
  candidateId: string;
  reason: string;
};

export type BulkApproveInput = {
  candidateIds: string[];
};

export type HardwarePackInfo = {
  profile: string;
  label: string;
  description: string;
  maxModelSizeBytes: string;
  recommendedModels: string[];
};

export type InstallPackInput = {
  profile: string;
};

export type InstallPackResult = {
  profile: string;
  queued: number;
  alreadyInstalled: number;
  pullJobIds: string[];
};

export type PipelineResult = {
  discovered: number;
  imported: number;
  skipped: number;
  failed: number;
  candidateIds: string[];
};

export type CreateCatalogEntryServiceInput = {
  name: string;
  tag: string;
  displayName: string;
  category: import('../../../generated/prisma').ModelCategory;
  description: string | null;
  parameterCount: string | null;
  runtime: import('../../../generated/prisma').RuntimeType;
  ollamaName: string | null;
  isRecommended: boolean;
  capabilities: string[];
  businessCategories: string[];
  hardwareProfiles: string[];
};

export type UpdateCatalogEntryServiceInput = Partial<CreateCatalogEntryServiceInput>;

export type LibraryListing = {
  slug: string;
  displayName: string;
  description: string;
};

export type ClassifierInput = {
  name: string;
  tag: string;
  displayName: string;
  description: string | null;
  capabilities: string[];
};

export type ClassifierResult = {
  category: import('../../../generated/prisma').ModelCategory;
  businessCategories: import('../../../common/enums/business-category.enum').BusinessCategory[];
  confidence: number;
};

export type ParsedOllamaName = {
  name: string;
  tag: string;
};

export type CatalogDedupRef = {
  name: string;
  tag: string;
  ollamaName?: string | null;
};

export type InstalledDedupRef = {
  name: string;
  tag: string;
};

export type RankableModel = {
  name: string;
  tag: string;
  familyName: string | null;
  sizeBytes: bigint | null;
  capabilities: string[];
};
