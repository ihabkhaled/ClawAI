import {
  DeploymentPhase,
  DeploymentState,
  type DeploymentStatusDocument,
  type DeploymentStatusView,
} from '@claw/shared-types';

import { DEPLOYMENT_STATUS_STALE_MS } from '../constants/deployment-status.constants';
import { deploymentStatusSchema } from '../schemas/deployment-status.schema';

export function parseDeploymentStatus(value: unknown): DeploymentStatusDocument | null {
  const result = deploymentStatusSchema.safeParse(value);
  return result.success ? result.data : null;
}

export function toDeploymentStatusView(
  status: DeploymentStatusDocument,
  nowMs = Date.now(),
): DeploymentStatusView {
  const isStale =
    status.state === DeploymentState.RUNNING &&
    nowMs - Date.parse(status.updatedAt) > DEPLOYMENT_STATUS_STALE_MS;
  return { ...status, isStale };
}

export function unknownDeploymentStatusView(): DeploymentStatusView {
  return {
    schemaVersion: 1,
    state: DeploymentState.UNKNOWN,
    phase: DeploymentPhase.UNKNOWN,
    targetSha: null,
    previousSha: null,
    deployedSha: null,
    version: null,
    services: [],
    currentService: null,
    startedAt: null,
    updatedAt: null,
    completedAt: null,
    workflowUrl: null,
    failureCode: null,
    isStale: false,
  };
}
