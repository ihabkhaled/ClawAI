import {
  DeploymentRunConclusion,
  DeploymentRunStatus,
  DeploymentState,
  type DeploymentStatusView,
} from '@claw/shared-types';

import { DEPLOYMENT_TROUBLESHOOTING_STEPS } from '@/constants/deployment.constants';
import { DeploymentTroubleshootingSituation } from '@/enums/deployment-troubleshooting-situation.enum';

/**
 * Which situation the operator is actually in, resolved from the box's status
 * file AND the live GitHub run together.
 *
 * The two disagree in exactly the case that matters most: the status file still
 * says `running` while the workflow has already failed. That is the "stuck
 * build" an operator cannot explain, so it is checked before staleness.
 */
export function resolveTroubleshootingSituation(
  status: DeploymentStatusView,
  runStatus: DeploymentRunStatus | null,
  runConclusion: DeploymentRunConclusion | null,
): DeploymentTroubleshootingSituation | null {
  const runFailed =
    runStatus === DeploymentRunStatus.COMPLETED &&
    runConclusion !== null &&
    runConclusion !== DeploymentRunConclusion.SUCCESS &&
    runConclusion !== DeploymentRunConclusion.SKIPPED;

  if (status.state === DeploymentState.RUNNING && runFailed) {
    return DeploymentTroubleshootingSituation.ABANDONED;
  }
  if (status.isStale) {
    return DeploymentTroubleshootingSituation.STALE;
  }
  if (runStatus === DeploymentRunStatus.IN_PROGRESS) {
    return null;
  }
  if (runFailed || status.state === DeploymentState.FAILED) {
    return DeploymentTroubleshootingSituation.FAILED;
  }
  if (!status.manualTriggerEnabled) {
    return DeploymentTroubleshootingSituation.UNCONFIGURED;
  }
  return null;
}

/** The ordered remediation steps for a situation, as i18n key suffixes. */
export function troubleshootingSteps(situation: DeploymentTroubleshootingSituation): string[] {
  return [...DEPLOYMENT_TROUBLESHOOTING_STEPS[situation]];
}
