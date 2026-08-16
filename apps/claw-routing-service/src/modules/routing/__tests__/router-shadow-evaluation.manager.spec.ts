import { RouterShadowEvaluationManager } from '../managers/router-shadow-evaluation.manager';
import { type RoutingDecisionsRepository } from '../repositories/routing-decisions.repository';
import { type CloudRouterManager } from '../managers/cloud-router.manager';
import { type CloudRouterEligibilityManager } from '../managers/cloud-router-eligibility.manager';
import { type CloudRouterPromptManager } from '../managers/cloud-router-prompt.manager';
import { EntityNotFoundException } from '../../../common/errors';
import { RouterErrorCode } from '../../../common/enums';
import { RouterProvider, RoutingMode } from '../../../generated/prisma';
import { type RoutingDecisionWithOutcomes } from '../types/routing.types';
import { type CloudRouteResult } from '../types/cloud-router.types';
import { type EligibleDeploymentRecord } from '../types/model-deployment.types';

const mockDecision = (
  overrides: Partial<RoutingDecisionWithOutcomes> = {},
): RoutingDecisionWithOutcomes =>
  ({
    id: 'decision-1',
    messageId: 'msg-1',
    threadId: 'thread-1',
    messageContent: 'Write a Python function to sort a list',
    selectedProvider: 'anthropic',
    selectedModel: 'claude-sonnet-4',
    routingMode: RoutingMode.AUTO,
    confidence: 0.75,
    reasonTags: ['auto'],
    privacyClass: 'cloud',
    costClass: 'medium',
    fallbackProvider: null,
    fallbackModel: null,
    routingDurationMs: 220,
    createdAt: new Date(),
    outcomes: [],
    ...overrides,
  }) as unknown as RoutingDecisionWithOutcomes;

const eligibleDeployment: EligibleDeploymentRecord = {
  id: 'dep-1',
  provider: RouterProvider.ANTHROPIC,
  providerModelId: 'claude-sonnet-4',
};

const availableCloudResult = (overrides: Partial<CloudRouteResult> = {}): CloudRouteResult =>
  ({
    available: true,
    configurationRevision: 3,
    excluded: [],
    outcome: {
      ok: true,
      decision: {
        deploymentId: 'dep-1',
        workflow: 'DIRECT_LLM',
        confidence: 0.92,
        reasonCodes: [],
      },
      attempts: [
        {
          entryId: 'e1',
          order: 1,
          attemptNumber: 1,
          provider: RouterProvider.ANTHROPIC,
          providerModelId: 'claude-sonnet-4',
          deploymentId: 'dep-1',
          outcome: 'SUCCESS',
          code: null,
          safeMessage: null,
          latencyMs: 450,
          wasRepair: false,
        },
      ],
      fallbackDepth: 0,
    },
    ...overrides,
  }) as unknown as CloudRouteResult;

describe('RouterShadowEvaluationManager', () => {
  let manager: RouterShadowEvaluationManager;
  let decisionsRepo: { findByIdWithOutcome: jest.Mock; findRecentWithOutcomes: jest.Mock };
  let cloudRouter: { route: jest.Mock };
  let eligibility: { resolveEligibleDeployments: jest.Mock };
  let prompt: { buildPrompt: jest.Mock };

  beforeEach(() => {
    decisionsRepo = {
      findByIdWithOutcome: jest.fn().mockResolvedValue(mockDecision()),
      findRecentWithOutcomes: jest.fn().mockResolvedValue([mockDecision()]),
    };
    cloudRouter = { route: jest.fn().mockResolvedValue(availableCloudResult()) };
    eligibility = {
      resolveEligibleDeployments: jest.fn().mockResolvedValue([eligibleDeployment]),
    };
    prompt = { buildPrompt: jest.fn().mockReturnValue('compact router prompt') };

    manager = new RouterShadowEvaluationManager(
      decisionsRepo as unknown as RoutingDecisionsRepository,
      cloudRouter as unknown as CloudRouterManager,
      eligibility as unknown as CloudRouterEligibilityManager,
      prompt as unknown as CloudRouterPromptManager,
    );
  });

  describe('compareLegacyVsCloud', () => {
    it('throws EntityNotFoundException when the decision does not exist', async () => {
      decisionsRepo.findByIdWithOutcome.mockResolvedValue(null);

      await expect(manager.compareLegacyVsCloud('missing')).rejects.toThrow(
        EntityNotFoundException,
      );
    });

    it('runs the challenger through CloudRouterManager.route without a threadId (shadow, non-serving)', async () => {
      await manager.compareLegacyVsCloud('decision-1');

      expect(eligibility.resolveEligibleDeployments).toHaveBeenCalledWith(
        expect.objectContaining({ threadId: 'thread-1', message: expect.any(String) }),
      );
      expect(cloudRouter.route).toHaveBeenCalledTimes(1);
      const call = cloudRouter.route.mock.calls[0]?.[0] as Record<string, unknown>;
      expect(call['threadId']).toBeUndefined();
      expect(typeof call['traceId']).toBe('string');
      expect(call['eligibleDeploymentIds']).toEqual(['dep-1']);
    });

    it('marks choiceAgrees true when the cloud router picks the same provider and model', async () => {
      const result = await manager.compareLegacyVsCloud('decision-1');

      expect(result.legacy.provider).toBe('anthropic');
      expect(result.cloud.provider).toBe(RouterProvider.ANTHROPIC);
      expect(result.choiceAgrees).toBe(true);
    });

    it('marks choiceAgrees false when the cloud router picks a different provider', async () => {
      cloudRouter.route.mockResolvedValue(
        availableCloudResult({
          outcome: {
            ok: true,
            decision: {
              deploymentId: 'dep-2',
              workflow: 'DIRECT_LLM',
              confidence: 0.8,
              reasonCodes: [],
            },
            attempts: [],
            fallbackDepth: 0,
          },
        } as unknown as Partial<CloudRouteResult>),
      );
      eligibility.resolveEligibleDeployments.mockResolvedValue([
        eligibleDeployment,
        { id: 'dep-2', provider: RouterProvider.GEMINI, providerModelId: 'gemini-2.5-flash' },
      ]);

      const result = await manager.compareLegacyVsCloud('decision-1');

      expect(result.cloud.provider).toBe(RouterProvider.GEMINI);
      expect(result.choiceAgrees).toBe(false);
    });

    it('never calls route() when there is no cloud-eligible deployment, and reports unavailable', async () => {
      eligibility.resolveEligibleDeployments.mockResolvedValue([]);

      const result = await manager.compareLegacyVsCloud('decision-1');

      expect(cloudRouter.route).not.toHaveBeenCalled();
      expect(result.cloud.available).toBe(false);
      expect(result.cloud.unavailableReason).toBe('NO_ELIGIBLE_EXECUTION_MODEL');
      expect(result.choiceAgrees).toBe(false);
    });

    it('reports cloud unavailable (no published configuration) with quality/cost/latency all unavailable', async () => {
      cloudRouter.route.mockResolvedValue({
        available: false,
        reason: 'NO_PUBLISHED_CONFIGURATION',
      });

      const result = await manager.compareLegacyVsCloud('decision-1');

      expect(result.cloud.available).toBe(false);
      expect(result.cloud.unavailableReason).toBe('NO_PUBLISHED_CONFIGURATION');
      expect(result.cloud.quality.available).toBe(false);
      expect(result.cloud.cost.available).toBe(false);
      expect(result.cloud.latency.available).toBe(false);
      expect(result.cloud.failure.failed).toBe(true);
      expect(result.cloud.failure.code).toBe('NO_PUBLISHED_CONFIGURATION');
    });

    it('reports a coordinator chain failure with the error code and last-attempt latency', async () => {
      cloudRouter.route.mockResolvedValue({
        available: true,
        configurationRevision: 5,
        excluded: [],
        outcome: {
          ok: false,
          code: RouterErrorCode.PROVIDER_5XX,
          attempts: [
            {
              entryId: 'e1',
              order: 1,
              attemptNumber: 1,
              provider: RouterProvider.ANTHROPIC,
              providerModelId: 'claude-sonnet-4',
              deploymentId: 'dep-1',
              outcome: 'FAILURE',
              code: RouterErrorCode.PROVIDER_5XX,
              safeMessage: 'upstream down',
              latencyMs: 120,
              wasRepair: false,
            },
          ],
          quarantinedDeploymentIds: [],
        },
      } as unknown as CloudRouteResult);

      const result = await manager.compareLegacyVsCloud('decision-1');

      expect(result.cloud.available).toBe(true);
      expect(result.cloud.failure.failed).toBe(true);
      expect(result.cloud.failure.code).toBe(RouterErrorCode.PROVIDER_5XX);
      expect(result.cloud.failure.safeMessage).toBe('upstream down');
      expect(result.cloud.latency).toEqual({ available: true, latencyMs: 120 });
      expect(result.choiceAgrees).toBe(false);
    });

    it('reports the excluded chain entries as the cloud "constraints"', async () => {
      cloudRouter.route.mockResolvedValue(
        availableCloudResult({
          excluded: [
            {
              entryId: 'e2',
              order: 2,
              provider: RouterProvider.GEMINI,
              modelAlias: 'gemini-fallback',
              reason: 'DEPLOYMENT_NOT_ACTIVE',
            },
          ],
        }),
      );

      const result = await manager.compareLegacyVsCloud('decision-1');

      expect(result.cloud.excluded).toHaveLength(1);
      expect(result.cloud.excluded[0]?.reason).toBe('DEPLOYMENT_NOT_ACTIVE');
    });

    it('reports cloud quality as unavailable — a shadow decision was never executed', async () => {
      const result = await manager.compareLegacyVsCloud('decision-1');

      expect(result.cloud.quality.available).toBe(false);
      expect(result.cloud.quality.unavailableReason).toBe('NOT_EXECUTED_SHADOW_ONLY');
      expect(result.cloud.quality.evaluatorVersion).toBe(result.evaluatorVersion);
    });

    it('reports cloud cost as unavailable — the cloud router does not rank by cost', async () => {
      const result = await manager.compareLegacyVsCloud('decision-1');

      expect(result.cloud.cost.available).toBe(false);
      expect(result.cloud.cost.unavailableReason).toBe('CLOUD_ROUTER_DOES_NOT_RANK_BY_COST');
    });

    it('reads the legacy judge/critic quality signal when an outcome record exists', async () => {
      decisionsRepo.findByIdWithOutcome.mockResolvedValue(
        mockDecision({
          outcomes: [
            {
              judgeOutcome: 'VERIFIED',
              judgeConfidence: 0.88,
              criticScore: 0.91,
              executionSuccess: true,
              executionStatus: 'SUCCEEDED',
              followUpSignal: null,
            },
          ],
        } as unknown as Partial<RoutingDecisionWithOutcomes>),
      );

      const result = await manager.compareLegacyVsCloud('decision-1');

      expect(result.legacy.quality).toEqual({
        evaluatorVersion: result.evaluatorVersion,
        available: true,
        judgeOutcome: 'VERIFIED',
        judgeConfidence: 0.88,
        criticScore: 0.91,
      });
    });

    it('marks legacy quality unavailable (NOT_JUDGED) when the outcome exists but was never judged', async () => {
      decisionsRepo.findByIdWithOutcome.mockResolvedValue(
        mockDecision({
          outcomes: [
            {
              judgeOutcome: 'NONE',
              judgeConfidence: null,
              criticScore: null,
              executionSuccess: true,
              executionStatus: 'SUCCEEDED',
              followUpSignal: null,
            },
          ],
        } as unknown as Partial<RoutingDecisionWithOutcomes>),
      );

      const result = await manager.compareLegacyVsCloud('decision-1');

      expect(result.legacy.quality).toEqual({
        evaluatorVersion: result.evaluatorVersion,
        available: false,
        unavailableReason: 'NOT_JUDGED',
      });
    });

    it('marks legacy quality unavailable (NO_OUTCOME_RECORD) when no outcome was ever recorded', async () => {
      const result = await manager.compareLegacyVsCloud('decision-1');

      expect(result.legacy.quality).toEqual({
        evaluatorVersion: result.evaluatorVersion,
        available: false,
        unavailableReason: 'NO_OUTCOME_RECORD',
      });
    });

    it('marks legacy cost unavailable when costClass was never recorded', async () => {
      decisionsRepo.findByIdWithOutcome.mockResolvedValue(mockDecision({ costClass: null }));

      const result = await manager.compareLegacyVsCloud('decision-1');

      expect(result.legacy.cost).toEqual({
        available: false,
        unavailableReason: 'NO_COST_CLASS_RECORDED',
      });
    });

    it('marks legacy latency unavailable when routingDurationMs was never recorded', async () => {
      decisionsRepo.findByIdWithOutcome.mockResolvedValue(
        mockDecision({ routingDurationMs: null }),
      );

      const result = await manager.compareLegacyVsCloud('decision-1');

      expect(result.legacy.latency).toEqual({ available: false });
    });

    it('reports a legacy execution failure from the outcome record', async () => {
      decisionsRepo.findByIdWithOutcome.mockResolvedValue(
        mockDecision({
          outcomes: [
            {
              judgeOutcome: 'NONE',
              judgeConfidence: null,
              criticScore: null,
              executionSuccess: false,
              executionStatus: 'FAILED',
              followUpSignal: 'provider timeout',
            },
          ],
        } as unknown as Partial<RoutingDecisionWithOutcomes>),
      );

      const result = await manager.compareLegacyVsCloud('decision-1');

      expect(result.legacy.failure).toEqual({
        failed: true,
        code: 'FAILED',
        safeMessage: 'provider timeout',
      });
    });

    it('never reports the legacy routing decision itself as failed absent an outcome', async () => {
      const result = await manager.compareLegacyVsCloud('decision-1');

      expect(result.legacy.failure).toEqual({ failed: false });
    });

    it('redacts the stored preview to the first 120 characters and never exposes the full message', async () => {
      const longMessage = 'x'.repeat(500);
      decisionsRepo.findByIdWithOutcome.mockResolvedValue(
        mockDecision({ messageContent: longMessage }),
      );

      const result = await manager.compareLegacyVsCloud('decision-1');

      expect(result.messagePreview).toHaveLength(120);
      expect(result).not.toHaveProperty('messageContent');
    });

    it('stamps the evaluator/rubric version on the top-level comparison', async () => {
      const result = await manager.compareLegacyVsCloud('decision-1');

      expect(result.evaluatorVersion).toBe('routing-judge-rubric-v1');
    });
  });

  describe('compareLegacyVsCloudBatch', () => {
    it('aggregates agreement, availability, and failure counts across decisions', async () => {
      decisionsRepo.findRecentWithOutcomes.mockResolvedValue([
        mockDecision({ id: 'd1' }),
        mockDecision({ id: 'd2', selectedProvider: 'openai', selectedModel: 'gpt-4o' }),
      ]);

      const result = await manager.compareLegacyVsCloudBatch({ limit: 50 });

      expect(result.totalCompared).toBe(2);
      expect(result.cloudAvailableCount).toBe(2);
      // d1 agrees (anthropic/claude-sonnet-4 both sides); d2 does not (legacy openai vs cloud anthropic).
      expect(result.cloudAgreesCount).toBe(1);
      expect(result.agreementRate).toBe(0.5);
      expect(result.results).toHaveLength(2);
    });

    it('excludes a decision whose challenger run throws, without failing the whole batch', async () => {
      decisionsRepo.findRecentWithOutcomes.mockResolvedValue([
        mockDecision({ id: 'd1' }),
        mockDecision({ id: 'd2' }),
      ]);
      cloudRouter.route
        .mockResolvedValueOnce(availableCloudResult())
        .mockRejectedValueOnce(new Error('provider exploded'));

      const result = await manager.compareLegacyVsCloudBatch({ limit: 50 });

      expect(result.totalCompared).toBe(1);
      expect(result.results[0]?.decisionId).toBe('d1');
    });

    it('reports zero agreement rate for an empty batch without dividing by zero', async () => {
      decisionsRepo.findRecentWithOutcomes.mockResolvedValue([]);

      const result = await manager.compareLegacyVsCloudBatch({ limit: 50 });

      expect(result.totalCompared).toBe(0);
      expect(result.agreementRate).toBe(0);
    });
  });
});
