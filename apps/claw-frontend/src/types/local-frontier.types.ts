import {
  type FrontierDownloadStatus,
  type FrontierLoadStatus,
  type FrontierModelCategory,
  type FrontierPullJobPhase,
  type FrontierPullJobStatus,
  type FrontierQualityTier,
  type HardwareCompat,
  type PreflightReasonCode,
} from '@/enums/local-frontier.enum';

export interface FrontierCatalogEntry {
  id: string;
  name: string;
  tag: string;
  displayName: string;
  category: FrontierModelCategory;
  description: string;
  parameterCount: string;
  totalParamsB: number;
  activeParamsB: number;
  contextLength: number;
  capabilities: string[];
  license: string;
  huggingfaceRepo: string;
  filePattern: string;
  fileSizeBytes: number;
  requiredRamGb: number;
  recommendedRamGb: number;
  requiredDiskGb: number;
  recommendedGpuVramGb: number;
  isRecommended: boolean;
  qualityTier: FrontierQualityTier;
  sourceUrl: string;
  downloadStatus: FrontierDownloadStatus;
  loadStatus: FrontierLoadStatus;
  available: boolean;
}

export interface FrontierCatalogList {
  data: FrontierCatalogEntry[];
  total: number;
  nextCursor: string | null;
}

export interface FrontierCatalogFilters {
  category?: FrontierModelCategory;
  qualityTier?: FrontierQualityTier;
  compatibleOnly?: boolean;
  limit?: number;
  cursor?: string;
  search?: string;
}

export interface FrontierGpu {
  vendor: string;
  model: string;
  vramGb: number;
  driver: string;
}

export interface HardwareSnapshot {
  totalRamGb: number;
  freeRamGb: number;
  totalDiskGb: number;
  freeDiskGb: number;
  cpuCores: number;
  platform: string;
  gpus: FrontierGpu[];
  gpuBackend: string;
  capturedAt: string;
}

export interface PullJob {
  id: string;
  modelId: string;
  status: FrontierPullJobStatus;
  phase: FrontierPullJobPhase;
  totalBytes: number;
  downloadedBytes: number;
  totalFiles: number;
  completedFiles: number;
  currentFile: string | null;
  installStep: string | null;
  installAttempts: number;
  retryAttempts: number;
  resumedAt: string | null;
  lastProgressAt: string | null;
  reasonCode: string | null;
  errorMessage: string | null;
  startedAt: string;
  completedAt: string | null;
}

export interface PullJobProgressEvent {
  jobId: string;
  status: FrontierPullJobStatus;
  phase: FrontierPullJobPhase;
  bytesDownloaded: number;
  totalBytes: number;
  completedFiles: number;
  totalFiles: number;
  currentFile: string | null;
  installStep: string | null;
  installAttempts: number;
  retryAttempts: number;
  mbps: number;
  speedBytesPerSec: number;
  etaSeconds: number | null;
  elapsedMs: number;
  reasonCode: string | null;
  errorMessage: string | null;
}

export interface RuntimeConfig {
  modelId: string;
  nGpuLayers: number | null;
  ctxSize: number;
  cpuMoe: boolean;
  threads: number | null;
  customArgs: string | null;
}

export interface UpdateRuntimeConfigPayload {
  nGpuLayers?: number | null;
  ctxSize?: number;
  cpuMoe?: boolean;
  threads?: number | null;
  customArgs?: string | null;
}

export interface LoadedModel {
  id: string;
  name: string;
  tag: string;
  loadStatus: FrontierLoadStatus;
  port: number | null;
  pid: number | null;
}

export interface PreflightResult {
  ok: boolean;
  reasons: PreflightReasonCode[];
  overridable: boolean;
}

export interface CompatChipMeta {
  chip: HardwareCompat;
  reasons: PreflightReasonCode[];
}

export interface RuntimeInfo {
  binaryVersion: string | null;
  platform: string;
  gpuBackend: string;
  binaryPath: string | null;
  capabilities: string[];
}

export interface PullJobCreateResult {
  jobId: string;
  sseUrl: string;
}
