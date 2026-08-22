import {
  type DeploymentAutomationDocument,
  DeploymentPhase,
  DeploymentState,
  type DeploymentStatusDocument,
  type DeploymentStatusView,
} from '@claw/shared-types';

import {
  DEPLOYMENT_RESET_FAILURE_CODE,
  DEPLOYMENT_STATUS_STALE_MS,
} from '../constants/deployment-status.constants';
import {
  deploymentAutomationSchema,
  deploymentStatusSchema,
} from '../schemas/deployment-status.schema';
import { type DeploymentViewFlags } from '../types/deployment-view.types';

export function parseDeploymentStatus(value: unknown): DeploymentStatusDocument | null {
  const result = deploymentStatusSchema.safeParse(value);
  return result.success ? result.data : null;
}

export function parseDeploymentAutomation(value: unknown): DeploymentAutomationDocument | null {
  const result = deploymentAutomationSchema.safeParse(value);
  return result.success ? result.data : null;
}

export function toDeploymentStatusView(
  status: DeploymentStatusDocument,
  flags: DeploymentViewFlags,
  nowMs = Date.now(),
): DeploymentStatusView {
  const isStale =
    status.state === DeploymentState.RUNNING &&
    nowMs - Date.parse(status.updatedAt) > DEPLOYMENT_STATUS_STALE_MS;
  return { ...status, isStale, ...flags };
}

export function unknownDeploymentStatusView(flags: DeploymentViewFlags): DeploymentStatusView {
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
    ...flags,
  };
}

/**
 * Rewrites a rollout that stopped reporting as a failed one, so the pipeline is
 * no longer blocked behind a `running` record nobody is driving. The target,
 * previous and deployed SHAs are preserved verbatim: an operator clearing the
 * record is asserting the rollout is dead, not that production moved.
 */
export function toResetDeploymentStatus(
  status: DeploymentStatusDocument,
  nowIso: string,
): DeploymentStatusDocument {
  return {
    ...status,
    state: DeploymentState.FAILED,
    currentService: null,
    updatedAt: nowIso,
    completedAt: nowIso,
    failureCode: DEPLOYMENT_RESET_FAILURE_CODE,
  };
}
