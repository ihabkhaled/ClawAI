import {
  type PullJobCancelOutcome,
  type PullJobPhase,
  type PullJobStatus,
} from '../../../common/enums';

export interface PullJob {
  id: string;
  modelId: string;
  status: PullJobStatus;
  phase: PullJobPhase;
  totalBytes: bigint;
  downloadedBytes: bigint;
  totalFiles: number;
  completedFiles: number;
  currentFile: string | null;
  installStep: string | null;
  installAttempts: number;
  retryAttempts: number;
  resumedAt: Date | null;
  lastProgressAt: Date | null;
  reasonCode: string | null;
  errorMessage: string | null;
  startedAt: Date;
  completedAt: Date | null;
  initiatedByUser: string | null;
}

export interface PullJobProgressEvent {
  jobId: string;
  status: PullJobStatus;
  phase: PullJobPhase;
  bytesDownloaded: bigint;
  totalBytes: bigint;
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

export interface PullJobCreatePayload {
  modelId: string;
  overrideHardwareGate: boolean;
  initiatedByUser?: string;
}

export interface PullJobCreateResult {
  jobId: string;
  sseUrl: string;
}

export interface PullJobCancelResult {
  id: string;
  status: PullJobCancelOutcome;
}
