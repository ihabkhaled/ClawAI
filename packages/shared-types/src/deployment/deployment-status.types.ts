import { type DeploymentPhase } from './deployment-phase.enum';
import { type DeploymentState } from './deployment-state.enum';

export type DeploymentStatusDocument = {
  schemaVersion: 1;
  state: DeploymentState;
  phase: DeploymentPhase;
  targetSha: string;
  previousSha: string | null;
  deployedSha: string | null;
  version: string | null;
  services: string[];
  currentService: string | null;
  startedAt: string;
  updatedAt: string;
  completedAt: string | null;
  workflowUrl: string | null;
  failureCode: string | null;
};

export type DeploymentStatusView = {
  schemaVersion: 1;
  state: DeploymentState;
  phase: DeploymentPhase;
  targetSha: string | null;
  previousSha: string | null;
  deployedSha: string | null;
  version: string | null;
  services: string[];
  currentService: string | null;
  startedAt: string | null;
  updatedAt: string | null;
  completedAt: string | null;
  workflowUrl: string | null;
  failureCode: string | null;
  isStale: boolean;
};
