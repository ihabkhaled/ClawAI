import {
  type DeploymentRunConclusion,
  type DeploymentRunStatus,
  type DeploymentRunUnavailableReason,
} from './deployment-run-status.enum';

/** One step inside a job — the finest granularity GitHub reports. */
export type DeploymentRunStep = {
  number: number;
  name: string;
  status: DeploymentRunStatus;
  conclusion: DeploymentRunConclusion | null;
  startedAt: string | null;
  completedAt: string | null;
};

export type DeploymentRunJob = {
  id: number;
  name: string;
  status: DeploymentRunStatus;
  conclusion: DeploymentRunConclusion | null;
  url: string;
  startedAt: string | null;
  completedAt: string | null;
  steps: DeploymentRunStep[];
};

/** Where a run is right now, so the page can say it in one line. */
export type DeploymentRunPointer = {
  jobName: string;
  stepName: string;
  jobUrl: string;
};

export type DeploymentRunView = {
  id: number;
  runNumber: number;
  status: DeploymentRunStatus;
  conclusion: DeploymentRunConclusion | null;
  url: string;
  headSha: string;
  /** 'auto' or 'manual' when the run recorded it, null for older runs. */
  triggerSource: string | null;
  startedAt: string | null;
  updatedAt: string | null;
  jobs: DeploymentRunJob[];
  /** The step executing right now, or null when nothing is running. */
  currentStep: DeploymentRunPointer | null;
  /** The first step that failed, which is the one worth reading logs for. */
  failedStep: DeploymentRunPointer | null;
};

/**
 * Live progress of the most recent production deployment run.
 *
 * `run` is null whenever `available` is false, and `reason` then says why —
 * the page distinguishes "not configured" from "GitHub is unreachable" rather
 * than showing an empty panel for both.
 */
export type DeploymentRunProgress = {
  available: boolean;
  reason: DeploymentRunUnavailableReason | null;
  run: DeploymentRunView | null;
};
