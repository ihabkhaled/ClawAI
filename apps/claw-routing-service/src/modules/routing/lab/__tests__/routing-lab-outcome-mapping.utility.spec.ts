import {
  RouterErrorCode,
  RoutingLabCaseCategory,
  RoutingLabConfigurationVariant,
  RoutingLabPromptLengthBucket,
} from '../../../../common/enums';
import { DomainTag, PrivacyClass, RouterProvider } from '../../../../generated/prisma';
import type { CloudRouteResult } from '../../types/cloud-router.types';
import type { RoutingLabCase } from '../types/routing-lab-corpus.types';
import { mapCloudRouteResultToOutcome } from '../utilities/routing-lab-outcome-mapping.utility';

const LAB_CASE: RoutingLabCase = {
  id: 'case-x',
  category: RoutingLabCaseCategory.EDGE_CASE,
  description: 'test case',
  configurationVariant: RoutingLabConfigurationVariant.DEFAULT,
  privacyClass: PrivacyClass.CLOUD_PERMITTED,
  domain: DomainTag.GENERAL,
  lengthBucket: RoutingLabPromptLengthBucket.SHORT,
  prompt: 'hello',
  eligibleDeploymentIds: ['dep_a'],
  faultPlan: {},
};

describe('mapCloudRouteResultToOutcome', () => {
  it('maps an unavailable result to a failed, unavailable outcome', () => {
    const result: CloudRouteResult = { available: false, reason: 'NO_PUBLISHED_CONFIGURATION' };

    const outcome = mapCloudRouteResultToOutcome(LAB_CASE, result);

    expect(outcome).toMatchObject({
      caseId: 'case-x',
      available: false,
      passed: false,
      unavailableReason: 'NO_PUBLISHED_CONFIGURATION',
      finalErrorCode: null,
      fallbackDepth: null,
      attemptCount: 0,
    });
  });

  it('maps an available + successful outcome to passed:true with its depth and selection', () => {
    const result: CloudRouteResult = {
      available: true,
      configurationRevision: 1,
      excluded: [],
      outcome: {
        ok: true,
        decision: { deploymentId: 'dep_a', workflow: 'DIRECT', confidence: 0.9, reasonCodes: [] },
        attempts: [
          {
            entryId: 'e1',
            order: 1,
            attemptNumber: 1,
            provider: RouterProvider.GEMINI,
            providerModelId: 'm',
            deploymentId: 'dep_a',
            outcome: 'SUCCESS',
            code: null,
            safeMessage: null,
            latencyMs: 5,
            wasRepair: false,
          },
        ],
        fallbackDepth: 0,
      },
    };

    const outcome = mapCloudRouteResultToOutcome(LAB_CASE, result);

    expect(outcome.passed).toBe(true);
    expect(outcome.available).toBe(true);
    expect(outcome.fallbackDepth).toBe(0);
    expect(outcome.selectedDeploymentId).toBe('dep_a');
    expect(outcome.attemptCodes).toEqual([null]);
  });

  it('maps an available + failed (chain exhausted) outcome to passed:false with the final code', () => {
    const result: CloudRouteResult = {
      available: true,
      configurationRevision: 1,
      excluded: [],
      outcome: {
        ok: false,
        code: RouterErrorCode.PROVIDER_5XX,
        attempts: [
          {
            entryId: 'e1',
            order: 1,
            attemptNumber: 1,
            provider: RouterProvider.GEMINI,
            providerModelId: 'm',
            deploymentId: 'dep_a',
            outcome: 'FAILURE',
            code: RouterErrorCode.PROVIDER_5XX,
            safeMessage: 'down',
            latencyMs: 5,
            wasRepair: false,
          },
        ],
        quarantinedDeploymentIds: ['dep_a'],
      },
    };

    const outcome = mapCloudRouteResultToOutcome(LAB_CASE, result);

    expect(outcome.passed).toBe(false);
    expect(outcome.available).toBe(true);
    expect(outcome.finalErrorCode).toBe(RouterErrorCode.PROVIDER_5XX);
    expect(outcome.quarantinedDeploymentIds).toEqual(['dep_a']);
    expect(outcome.attemptCodes).toEqual([RouterErrorCode.PROVIDER_5XX]);
    expect(outcome.selectedDeploymentId).toBeNull();
  });
});
