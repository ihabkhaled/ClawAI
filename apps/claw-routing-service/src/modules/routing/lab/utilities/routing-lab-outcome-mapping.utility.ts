import type { CloudRouteResult } from '../../types/cloud-router.types';
import type { RoutingLabCase } from '../types/routing-lab-corpus.types';
import type { RoutingLabCaseOutcome } from '../types/routing-lab-run.types';

/**
 * Maps one `CloudRouteResult` back onto its originating `RoutingLabCase`.
 *
 * Kept separate from the runner so the three-way shape of `CloudRouteResult`
 * (unavailable / available+ok / available+failed) is unit-testable against
 * hand-built results, without spinning up a real `CloudRouterManager` for
 * every assertion.
 */
export function mapCloudRouteResultToOutcome(
  labCase: RoutingLabCase,
  result: CloudRouteResult,
): RoutingLabCaseOutcome {
  const shared = {
    caseId: labCase.id,
    category: labCase.category,
    description: labCase.description,
    domain: labCase.domain,
    privacyClass: labCase.privacyClass,
  };

  if (!result.available) {
    return {
      ...shared,
      available: false,
      passed: false,
      unavailableReason: result.reason,
      finalErrorCode: null,
      fallbackDepth: null,
      attemptCount: 0,
      attemptCodes: [],
      quarantinedDeploymentIds: [],
      selectedDeploymentId: null,
    };
  }

  const { outcome } = result;
  if (outcome.ok) {
    return {
      ...shared,
      available: true,
      passed: true,
      unavailableReason: null,
      finalErrorCode: null,
      fallbackDepth: outcome.fallbackDepth,
      attemptCount: outcome.attempts.length,
      attemptCodes: outcome.attempts.map((attempt) => attempt.code),
      quarantinedDeploymentIds: [],
      selectedDeploymentId: outcome.decision.deploymentId,
    };
  }

  return {
    ...shared,
    available: true,
    passed: false,
    unavailableReason: null,
    finalErrorCode: outcome.code,
    fallbackDepth: null,
    attemptCount: outcome.attempts.length,
    attemptCodes: outcome.attempts.map((attempt) => attempt.code),
    quarantinedDeploymentIds: [...outcome.quarantinedDeploymentIds],
    selectedDeploymentId: null,
  };
}
