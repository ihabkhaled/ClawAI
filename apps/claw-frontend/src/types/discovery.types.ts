import type {
  CandidateStatus,
  CandidateStatusFilter,
  DiscoveryRunStatus,
  DiscoverySourceType,
  DownloadStatus,
} from '@/enums';

import type { PaginationMeta } from './audit.types';
import type { TranslateFunction } from './i18n.types';

export type DiscoverySource = {
  id: string;
  name: string;
  type: DiscoverySourceType;
  baseUrl: string;
  isEnabled: boolean;
  categories: string[];
  maxResults: number;
  minQuality: number;
  lastRunAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type CreateDiscoverySourceRequest = {
  name: string;
  type: DiscoverySourceType;
  baseUrl: string;
  isEnabled?: boolean;
  categories?: string[];
  maxResults?: number;
  minQuality?: number;
};

export type UpdateDiscoverySourceRequest = Partial<CreateDiscoverySourceRequest>;

export type DiscoveryRun = {
  id: string;
  sourceId: string;
  status: DiscoveryRunStatus;
  isDryRun: boolean;
  discoveredCount: number;
  importedCount: number;
  skippedCount: number;
  failedCount: number;
  errorMessage: string | null;
  triggeredBy: string | null;
  startedAt: string;
  completedAt: string | null;
  source?: DiscoverySource;
};

export type DiscoveryRunListResponse = {
  data: DiscoveryRun[];
  total: number;
  page: number;
  pageSize: number;
};

export type DiscoveryCandidate = {
  id: string;
  runId: string;
  name: string;
  tag: string;
  displayName: string;
  ollamaName: string;
  description: string | null;
  sizeBytes: string | null;
  parameterCount: string | null;
  familyName: string | null;
  runtime: string;
  capabilities: string[];
  suggestedCategory: string;
  businessCategories: string[];
  hardwareProfiles: string[];
  downloadStatus: DownloadStatus;
  confidence: number;
  sourceUrl: string | null;
  status: CandidateStatus;
  duplicateOfId: string | null;
  importedEntryId: string | null;
  rejectionReason: string | null;
  createdAt: string;
  updatedAt: string;
};

export type CandidateListResponse = {
  data: DiscoveryCandidate[];
  total: number;
  page: number;
  pageSize: number;
};

export type DiscoveryTriggerRequest = {
  sourceId?: string;
  isDryRun?: boolean;
};

export type DiscoveryTriggerResponse = {
  runId: string;
  status: DiscoveryRunStatus;
};

export type ApproveCandidateRequest = {
  overrides?: {
    displayName?: string;
    category?: string;
    businessCategories?: string[];
    hardwareProfiles?: string[];
    description?: string;
    isRecommended?: boolean;
  };
};

export type RejectCandidateRequest = {
  reason: string;
};

export type BulkApproveRequest = {
  candidateIds: string[];
};

export type BulkApproveResponse = {
  approved: number;
  duplicates: number;
  failed: number;
};

export type HardwarePack = {
  profile: string;
  label: string;
  description: string;
  maxModelSizeBytes: string;
  recommendedModels: string[];
};

export type InstallPackResponse = {
  profile: string;
  queued: number;
  alreadyInstalled: number;
  pullJobIds: string[];
};

export type CandidateListFilters = {
  page?: number;
  pageSize?: number;
  status?: CandidateStatus;
  runId?: string;
  category?: string;
  downloadStatus?: DownloadStatus;
  search?: string;
};

export type RunListFilters = {
  page?: number;
  pageSize?: number;
  sourceId?: string;
  status?: DiscoveryRunStatus;
};

export type PaginatedDiscoveryRuns = {
  data: DiscoveryRun[];
  meta: PaginationMeta;
};

export type CreateCatalogEntryRequest = {
  name: string;
  tag: string;
  displayName: string;
  category: string;
  description?: string | null;
  parameterCount?: string | null;
  runtime?: string;
  ollamaName?: string | null;
  isRecommended?: boolean;
  capabilities?: string[];
  businessCategories?: string[];
  hardwareProfiles?: string[];
};

export type UpdateCatalogEntryRequest = Partial<CreateCatalogEntryRequest>;

export type DiscoverySourcesQueryResult = {
  sources: DiscoverySource[];
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
  refetch: () => void;
};

export type DiscoverySourceMutationResult<TInput> = {
  mutate: (input: TInput) => void;
  isPending: boolean;
  error: Error | null;
};

export type DiscoveryRunsQueryResult = {
  runs: DiscoveryRun[];
  total: number;
  isLoading: boolean;
  isError: boolean;
};

export type TriggerDiscoveryResult = {
  mutate: (data: DiscoveryTriggerRequest) => void;
  isPending: boolean;
  error: Error | null;
  lastResult: DiscoveryTriggerResponse | undefined;
};

export type CandidatesQueryResult = {
  candidates: DiscoveryCandidate[];
  total: number;
  page: number;
  pageSize: number;
  isLoading: boolean;
  isError: boolean;
};

export type ApproveCandidateMutationResult = {
  mutate: (input: { id: string; data: ApproveCandidateRequest }) => void;
  isPending: boolean;
  error: Error | null;
};

export type RejectCandidateMutationResult = {
  mutate: (input: { id: string; data: RejectCandidateRequest }) => void;
  isPending: boolean;
  error: Error | null;
};

export type BulkApproveMutationResult = {
  mutate: (data: BulkApproveRequest) => void;
  isPending: boolean;
  error: Error | null;
  lastResult: BulkApproveResponse | undefined;
};

export type HardwarePacksQueryResult = {
  packs: HardwarePack[];
  isLoading: boolean;
  isError: boolean;
};

export type InstallPackMutationResult = {
  mutate: (profile: string) => void;
  isPending: boolean;
  error: Error | null;
  lastResult: InstallPackResponse | undefined;
};

export type DiscoveryToolbarProps = {
  statusFilter: CandidateStatus | undefined;
  searchFilter: string;
  onStatusChange: (value: CandidateStatus | undefined) => void;
  onSearchChange: (value: string) => void;
  onTriggerRefresh: () => void;
  onTriggerDryRun: () => void;
  isTriggerPending: boolean;
  t: TranslateFunction;
};

export type DiscoveryCandidateCardProps = {
  candidate: DiscoveryCandidate;
  onApprove: (id: string) => void;
  onReject: (id: string, reason: string) => void;
  isApprovePending: boolean;
  isRejectPending: boolean;
  t: TranslateFunction;
};

export type RunsTimelineProps = {
  runs: DiscoveryRun[];
  isLoading: boolean;
  t: TranslateFunction;
};

export type HardwarePacksGridProps = {
  packs: HardwarePack[];
  isLoading: boolean;
  isInstallPending: boolean;
  onInstall: (profile: string) => void;
  t: TranslateFunction;
};

export type RunStatusIconProps = {
  status: DiscoveryRunStatus | string;
};

export type StatusFilterValue = CandidateStatusFilter;

export type StatusFilterOption = {
  label: string;
  value: StatusFilterValue;
};

export type DiscoveryPageReturn = {
  t: (key: string) => string;
  sources: DiscoverySource[];
  runs: DiscoveryRun[];
  candidates: DiscoveryCandidate[];
  candidatesTotal: number;
  packs: HardwarePack[];
  statusFilter: CandidateStatus | undefined;
  searchFilter: string;
  isLoadingSources: boolean;
  isLoadingRuns: boolean;
  isLoadingCandidates: boolean;
  isLoadingPacks: boolean;
  isTriggerPending: boolean;
  isApprovePending: boolean;
  isRejectPending: boolean;
  isBulkApprovePending: boolean;
  isInstallPackPending: boolean;
  setStatusFilter: (value: CandidateStatus | undefined) => void;
  setSearchFilter: (value: string) => void;
  handleTriggerRefresh: (sourceId?: string) => void;
  handleTriggerDryRun: () => void;
  handleApprove: (id: string) => void;
  handleReject: (id: string, reason: string) => void;
  handleBulkApprove: (ids: string[]) => void;
  handleInstallPack: (profile: string) => void;
};
