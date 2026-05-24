import type { LucideIcon } from 'lucide-react';

import type {
  FrontierModelCategory,
  FrontierQualityTier,
  HardwareCompat,
} from '@/enums/local-frontier.enum';
import type { useTranslation } from '@/lib/i18n';
import type {
  CompatChipMeta,
  FrontierCatalogEntry,
  HardwareSnapshot,
  LoadedModel,
  PullJob,
  PullJobProgressEvent,
  RuntimeInfo,
} from '@/types/local-frontier.types';

export interface HardwarePanelLabels {
  title: string;
  subtitle: string;
  refresh: string;
  ram: string;
  disk: string;
  cpu: string;
  gpu: string;
  binary: string;
  cores: string;
  noGpu: string;
  notInstalled: string;
  loadedModel: string;
  noLoadedModel: string;
  unload: string;
}

export interface FilterBarLabels {
  category: string;
  qualityTier: string;
  compatibleOnly: string;
  refreshCatalog: string;
  refreshing: string;
  allCategories: string;
  allTiers: string;
  categoryCoding: string;
  categoryReasoning: string;
  categoryThinking: string;
  categoryGeneral: string;
  categoryFileGen: string;
  tierSurvival: string;
  tierBalanced: string;
  tierBest: string;
}

export interface DownloadsDrawerLabels {
  title: string;
  empty: string;
  cancel: string;
  retry: string;
  remove: string;
  status: string;
  bytes: string;
  files: string;
  rate: string;
  eta: string;
  unknown: string;
}

export interface DeleteWeightsDialogLabels {
  title: string;
  description: string;
  promptLabel: string;
  placeholder: string;
  cancel: string;
  confirm: string;
  warning: string;
}

export interface OverridePromptLabels {
  title: string;
  description: string;
  reasonsTitle: string;
  cancel: string;
  proceed: string;
}

export interface RuntimeConfigDialogLabels {
  title: string;
  description: string;
  ngpuLayers: string;
  ngpuLayersHint: string;
  ctxSize: string;
  ctxSizeHint: string;
  threads: string;
  threadsHint: string;
  cpuMoe: string;
  cpuMoeHint: string;
  customArgs: string;
  customArgsHint: string;
  cancel: string;
  save: string;
}

export interface StatItem {
  icon: LucideIcon;
  label: string;
  value: string;
}

export interface DownloadJobView {
  job: PullJob;
  progress: PullJobProgressEvent | null;
  entry: FrontierCatalogEntry | undefined;
}

export interface RuntimeConfigDraft {
  nGpuLayers: number | null;
  ctxSize: number;
  cpuMoe: boolean;
  threads: number | null;
  customArgs: string | null;
}

export interface LocalFrontierPageController {
  t: ReturnType<typeof useTranslation>['t'];
  entries: FrontierCatalogEntry[];
  total: number;
  isLoading: boolean;
  isError: boolean;
  hardware: HardwareSnapshot | undefined;
  runtime: RuntimeInfo | undefined;
  loaded: LoadedModel | null;
  pullJobs: PullJob[];
  downloadViews: DownloadJobView[];
  compatByEntry: Map<string, CompatChipMeta>;
  category: FrontierModelCategory | undefined;
  qualityTier: FrontierQualityTier | undefined;
  compatibleOnly: boolean;
  setCategory: (value: FrontierModelCategory | undefined) => void;
  setQualityTier: (value: FrontierQualityTier | undefined) => void;
  setCompatibleOnly: (value: boolean) => void;
  isPullPending: boolean;
  isRefreshingCatalog: boolean;
  isRefreshingHardware: boolean;
  isUpdatingConfig: boolean;
  isDeleting: boolean;
  handlePullClick: (entry: FrontierCatalogEntry) => void;
  handleCancel: (jobId: string) => void;
  handleRetry: (jobId: string) => void;
  handleRefreshCatalog: () => void;
  handleRefreshHardware: () => void;
  handleLoad: (entry: FrontierCatalogEntry) => void;
  handleUnload: (entry: FrontierCatalogEntry) => void;
  handleUnloadCurrent: () => void;
  deleteDialogOpen: boolean;
  deleteEntry: FrontierCatalogEntry | null;
  deleteInputValue: string;
  setDeleteInputValue: (value: string) => void;
  handleDeleteClick: (entry: FrontierCatalogEntry) => void;
  handleDeleteCancel: () => void;
  handleDeleteConfirm: () => void;
  overrideDialogOpen: boolean;
  overrideEntry: FrontierCatalogEntry | null;
  overrideCompat: CompatChipMeta | null;
  handleOverrideCancel: () => void;
  handleOverrideConfirm: () => void;
  configDialogOpen: boolean;
  configDraft: RuntimeConfigDraft;
  setConfigDraft: (draft: RuntimeConfigDraft) => void;
  handleConfigureClick: (entry: FrontierCatalogEntry) => void;
  handleConfigureCancel: () => void;
  handleConfigureSave: () => void;
  hfDialogOpen: boolean;
  setHfDialogOpen: (open: boolean) => void;
  openHfDialog: () => void;
}

export interface CatalogCardProps {
  entry: FrontierCatalogEntry;
  compat: CompatChipMeta;
  onPullClick: (entry: FrontierCatalogEntry) => void;
  onLoadClick: (entry: FrontierCatalogEntry) => void;
  onUnloadClick: (entry: FrontierCatalogEntry) => void;
  onDeleteClick: (entry: FrontierCatalogEntry) => void;
  onConfigureClick: (entry: FrontierCatalogEntry) => void;
  isPullPending: boolean;
  labels: {
    download: string;
    load: string;
    unload: string;
    deleteWeights: string;
    configure: string;
    fits: string;
    warns: string;
    refuses: string;
    survival: string;
    balanced: string;
    best: string;
    sourceLink: string;
    contextLength: string;
    requiresRamGb: string;
  };
}

export interface CatalogGridProps {
  entries: FrontierCatalogEntry[];
  compatByEntry: Map<string, CompatChipMeta>;
  onPullClick: (entry: FrontierCatalogEntry) => void;
  onLoadClick: (entry: FrontierCatalogEntry) => void;
  onUnloadClick: (entry: FrontierCatalogEntry) => void;
  onDeleteClick: (entry: FrontierCatalogEntry) => void;
  onConfigureClick: (entry: FrontierCatalogEntry) => void;
  isPullPending: boolean;
  labels: CatalogCardProps['labels'];
}

export interface DeleteWeightsDialogProps {
  open: boolean;
  entry: FrontierCatalogEntry | null;
  inputValue: string;
  isPending: boolean;
  onInputChange: (value: string) => void;
  onCancel: () => void;
  onConfirm: () => void;
  labels: DeleteWeightsDialogLabels;
}

export interface DownloadJobRowProps {
  view: DownloadJobView;
  onCancel: (jobId: string) => void;
  onRetry: (jobId: string) => void;
  labels: DownloadsDrawerLabels;
}

export interface DownloadsDrawerProps {
  views: DownloadJobView[];
  onCancel: (jobId: string) => void;
  onRetry: (jobId: string) => void;
  labels: DownloadsDrawerLabels;
}

export interface FilterBarProps {
  category: FrontierModelCategory | undefined;
  qualityTier: FrontierQualityTier | undefined;
  compatibleOnly: boolean;
  isRefreshing: boolean;
  onCategoryChange: (value: FrontierModelCategory | undefined) => void;
  onQualityTierChange: (value: FrontierQualityTier | undefined) => void;
  onCompatibleOnlyChange: (value: boolean) => void;
  onRefreshCatalog: () => void;
  labels: FilterBarLabels;
}

export interface HardwareCompatChipProps {
  chip: HardwareCompat;
  label: string;
}

export interface HardwarePanelProps {
  hardware: HardwareSnapshot | undefined;
  runtime: RuntimeInfo | undefined;
  loaded: LoadedModel | null;
  isRefreshing: boolean;
  onRefresh: () => void;
  onUnloadCurrent: () => void;
  labels: HardwarePanelLabels;
}

export interface HardwareStatProps {
  icon: LucideIcon;
  label: string;
  value: string;
}

export interface OverridePromptDialogProps {
  open: boolean;
  entry: FrontierCatalogEntry | null;
  compat: CompatChipMeta | null;
  isPending: boolean;
  onCancel: () => void;
  onConfirm: () => void;
  labels: OverridePromptLabels;
}

export interface QualityTierBadgeProps {
  tier: FrontierQualityTier;
  label: string;
}

export interface RuntimeConfigDialogProps {
  open: boolean;
  loaded: LoadedModel | null;
  draft: RuntimeConfigDraft;
  isPending: boolean;
  onChange: (draft: RuntimeConfigDraft) => void;
  onCancel: () => void;
  onSave: () => void;
  labels: RuntimeConfigDialogLabels;
}
