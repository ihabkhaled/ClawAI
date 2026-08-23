import { type DeploymentCredentialView } from '@claw/shared-types';

/**
 * Operational flags the deployment page needs alongside the rollout record.
 * They come from configuration and the automation switch rather than from the
 * status file scripts/deploy-prod.sh writes, so they are composed onto the view
 * instead of being parsed out of it.
 */
export type DeploymentViewFlags = {
  manualTriggerEnabled: boolean;
  automaticDeployEnabled: boolean;
  credentials: DeploymentCredentialView;
};
