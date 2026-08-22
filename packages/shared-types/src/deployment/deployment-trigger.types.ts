import { type DeploymentTriggerMode } from './deployment-trigger-mode.enum';

/**
 * Outcome of a manual deployment dispatch. `targetSha` is null for
 * {@link DeploymentTriggerMode.LATEST}, where GitHub resolves the branch head
 * itself and the dispatch API gives us no SHA back.
 */
export type DeploymentTriggerResult = {
  dispatched: boolean;
  mode: DeploymentTriggerMode;
  targetSha: string | null;
  ref: string;
  workflowUrl: string;
};

/** Outcome of clearing a stuck rollout so the deployment page unblocks. */
export type DeploymentResetResult = {
  reset: boolean;
  clearedSha: string | null;
};
