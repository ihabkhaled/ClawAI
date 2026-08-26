import { type DeploymentCredentialView } from './deployment-credential.types';
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
  /**
   * True only when the WHOLE GitHub dispatch credential set is configured on
   * auth-service. A partial set does not half-enable manual deployment: the
   * page hides the controls instead of offering a button that always fails.
   */
  manualTriggerEnabled: boolean;
  /**
   * Whether a green release still deploys itself. False means an operator
   * paused the automatic lane, so production only moves on a manual dispatch.
   */
  automaticDeployEnabled: boolean;
  /** Redacted description of the credentials manual deployment would use. */
  credentials: DeploymentCredentialView;
};

/**
 * Persisted automatic-deploy switch. deploy-prod.sh reads this file on every
 * rollout it was told is automatic and refuses to touch production while
 * `enabled` is false; a manual dispatch ignores it by design.
 */
export type DeploymentAutomationDocument = {
  schemaVersion: 1;
  enabled: boolean;
  updatedAt: string;
};
