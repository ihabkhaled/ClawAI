export interface LlamacppBinaryPayload {
  version: string;
  platform: string;
  binaryPath?: string;
  previousVersion?: string | null;
}

export interface LlamacppPullPayload {
  jobId: string;
  modelId: string;
  modelName?: string;
  initiatedByUser?: string | null;
  downloadedBytes?: number;
  totalBytes?: number;
  completedFiles?: number;
  totalFiles?: number;
  reasonCode?: string;
  errorMessage?: string;
}

export interface LlamacppModelLifecyclePayload {
  modelId: string;
  modelName: string;
  pid?: number;
  port?: number;
  exitCode?: number | null;
  signal?: string | null;
}

export interface LlamacppPreflightPayload {
  userId: string | null;
  modelId: string;
  modelName: string;
  reasons: string[];
}

export type LlamacppEventPayload =
  | LlamacppBinaryPayload
  | LlamacppPullPayload
  | LlamacppModelLifecyclePayload
  | LlamacppPreflightPayload;
