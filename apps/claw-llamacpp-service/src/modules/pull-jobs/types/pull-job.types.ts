import { type PullJobCancelOutcome, type PullJobStatus } from '../../../common/enums';

export interface PullJob {
  id: string;
  modelId: string;
  status: PullJobStatus;
  totalBytes: bigint;
  downloadedBytes: bigint;
  totalFiles: number;
  completedFiles: number;
  currentFile: string | null;
  reasonCode: string | null;
  errorMessage: string | null;
  startedAt: Date;
  completedAt: Date | null;
  initiatedByUser: string | null;
}

export interface PullJobProgressEvent {
  jobId: string;
  status: PullJobStatus;
  bytesDownloaded: bigint;
  totalBytes: bigint;
  completedFiles: number;
  totalFiles: number;
  currentFile: string | null;
  mbps: number;
  etaSeconds: number | null;
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
