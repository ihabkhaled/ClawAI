import type { PullJobPhase } from '../../../common/enums';

export type PullProgressEvent = {
  status: string;
  digest?: string;
  total?: number;
  completed?: number;
  percentage: number;
  phase: PullJobPhase;
  installStep?: string;
  installAttempts?: number;
  retryAttempts?: number;
  speedBytesPerSec?: number;
  mbps?: number;
  etaSeconds?: number | null;
  elapsedMs?: number;
  errorMessage?: string;
};

export type PullProgressCallback = (event: PullProgressEvent) => void;

// Extracted to satisfy no-restricted-syntax (no string-literal unions in logic files).
export type PullProgressBase = {
  status: PullProgressEvent['status'];
  percentage: PullProgressEvent['percentage'];
  total?: PullProgressEvent['total'];
  completed?: PullProgressEvent['completed'];
};
