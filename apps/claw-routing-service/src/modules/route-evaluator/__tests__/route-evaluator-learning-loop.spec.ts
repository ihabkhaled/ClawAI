// Phase 9 — Learning loop integration test. Exercises the path that
// flows learned-score data from LearningLoopManager into the scoring
// engine's learnedSuccessRate input.

import { DomainTag } from '../../../generated/prisma';
import type { ClassifierManager } from '../../classifier/managers/classifier.manager';
import type { LearningLoopManager } from '../../learning-loop/managers/learning-loop.manager';
import type { CircuitBreakerManager } from '../../reliability/managers/circuit-breaker.manager';
import type { RouterModelRegistryRepository } from '../../router-models/repositories/router-model-registry.repository';
import type { ScoringEngineManager } from '../../scoring/managers/scoring-engine.manager';
import { RouteEvaluatorManager } from '../managers/route-evaluator.manager';

jest.mock('../../../app/config/app.config');
const { AppConfig } = jest.requireMock('../../../app/config/app.config') as {
  AppConfig: { get: jest.Mock };
};

const makeProfile = (provider: string, modelKey: string): any => ({
  id: `${provider}-${modelKey}`,
  provider,
  modelKey,
  displayName: modelKey,
  family: 'GPT',
  isLocal: false,
  isRouterOnly: false,
  isExecutionCapable: true,
  lifecycle: 'ACTIVE',
  modalitiesIn: ['TEXT'],
  modalitiesOut: ['TEXT'],
  domainTags: ['CODING'],
  notRecommendedFor: [],
  costClass: 'MEDIUM',
  latencyClass: 'FAST',
  qualityTier: 'HIGH',
  judgeSuitability: true,
  searchSuitability: false,
});

describe('RouteEvaluatorManager — Phase 9 learning loop integration', () => {
  let classifier: jest.Mocked<Partial<ClassifierManager>>;
  let registryRepo: { list: jest.Mock };
  let scorer: jest.Mocked<Partial<ScoringEngineManager>>;
  let circuit: { getState: jest.Mock };
  let learningLoop: { getRollingScore: jest.Mock };

  beforeEach(() => {
    classifier = {
      classify: jest.fn().mockReturnValue({
        domain: DomainTag.CODING,
        secondaryDomain: null,
        modalityIn: ['TEXT'],
        modalityOut: ['TEXT'],
        riskLevel: 'LOW',
        privacyClass: 'PUBLIC',
        confidence: 0.9,
        reasonTags: ['coding'],
      }),
    } as unknown as jest.Mocked<Partial<ClassifierManager>>;
    registryRepo = {
      list: jest.fn().mockResolvedValue({
        items: [makeProfile('OPENAI', 'gpt-4o'), makeProfile('ANTHROPIC', 'claude-sonnet-4')],
      }),
    };
    scorer = {
      score: jest.fn().mockReturnValue({
        ranked: [
          {
            profileId: 'OPENAI-gpt-4o',
            totalScore: 0.85,
            rejected: false,
            breakdown: [],
            winningDimensions: [],
            losingDimensions: [],
          },
        ],
        rejected: [],
      }),
    } as unknown as jest.Mocked<Partial<ScoringEngineManager>>;
    circuit = {
      getState: jest.fn().mockResolvedValue({ isAvailable: true }),
    };
    learningLoop = {
      getRollingScore: jest.fn().mockResolvedValue(0.87),
    };
  });

  it('passes learnedSuccessRate=null when the flag is OFF (back-compat)', async () => {
    AppConfig.get.mockReturnValue({
      ROUTING_LEARNING_LOOP_INTEGRATED_ENABLED: false,
    });
    const manager = new RouteEvaluatorManager(
      classifier as unknown as ClassifierManager,
      registryRepo as unknown as RouterModelRegistryRepository,
      scorer as unknown as ScoringEngineManager,
      circuit as unknown as CircuitBreakerManager,
      undefined,
      learningLoop as unknown as LearningLoopManager,
    );

    // The mocked scorer returns an incomplete RoutingDecisionV2; the
    // manager's final Zod validation throws. We only care about the
    // scoring input, so swallow that downstream throw.
    await manager
      .evaluate({
        messageContent: 'help me debug this code',
        attachedFileMimeTypes: [],
        routingMode: undefined,
        policyId: undefined,
      } as any)
      .catch(() => undefined);

    const scoringInput = scorer.score?.mock.calls[0]?.[0];
    expect(scoringInput.candidates[0].learnedSuccessRate).toBeNull();
    expect(scoringInput.candidates[1].learnedSuccessRate).toBeNull();
    expect(learningLoop.getRollingScore).not.toHaveBeenCalled();
  });

  it('passes the learned score from LearningLoopManager when the flag is ON', async () => {
    AppConfig.get.mockReturnValue({
      ROUTING_LEARNING_LOOP_INTEGRATED_ENABLED: true,
    });
    const manager = new RouteEvaluatorManager(
      classifier as unknown as ClassifierManager,
      registryRepo as unknown as RouterModelRegistryRepository,
      scorer as unknown as ScoringEngineManager,
      circuit as unknown as CircuitBreakerManager,
      undefined,
      learningLoop as unknown as LearningLoopManager,
    );

    // The mocked scorer returns an incomplete RoutingDecisionV2; the
    // manager's final Zod validation throws. We only care about the
    // scoring input, so swallow that downstream throw.
    await manager
      .evaluate({
        messageContent: 'help me debug this code',
        attachedFileMimeTypes: [],
        routingMode: undefined,
        policyId: undefined,
      } as any)
      .catch(() => undefined);

    const scoringInput = scorer.score?.mock.calls[0]?.[0];
    expect(scoringInput.candidates[0].learnedSuccessRate).toBe(0.87);
    expect(learningLoop.getRollingScore).toHaveBeenCalledWith(
      'OPENAI/gpt-4o',
      DomainTag.CODING,
      'default',
    );
  });

  it('falls back to null when LearningLoopManager throws (never poisons routing)', async () => {
    AppConfig.get.mockReturnValue({
      ROUTING_LEARNING_LOOP_INTEGRATED_ENABLED: true,
    });
    learningLoop.getRollingScore.mockRejectedValueOnce(new Error('db unreachable'));
    const manager = new RouteEvaluatorManager(
      classifier as unknown as ClassifierManager,
      registryRepo as unknown as RouterModelRegistryRepository,
      scorer as unknown as ScoringEngineManager,
      circuit as unknown as CircuitBreakerManager,
      undefined,
      learningLoop as unknown as LearningLoopManager,
    );

    // The mocked scorer returns an incomplete RoutingDecisionV2; the
    // manager's final Zod validation throws. We only care about the
    // scoring input, so swallow that downstream throw.
    await manager
      .evaluate({
        messageContent: 'help me debug this code',
        attachedFileMimeTypes: [],
        routingMode: undefined,
        policyId: undefined,
      } as any)
      .catch(() => undefined);

    const scoringInput = scorer.score?.mock.calls[0]?.[0];
    expect(scoringInput.candidates[0].learnedSuccessRate).toBeNull();
  });

  it('keeps learnedSuccessRate=null when LearningLoopManager is not provided', async () => {
    AppConfig.get.mockReturnValue({
      ROUTING_LEARNING_LOOP_INTEGRATED_ENABLED: true,
    });
    const manager = new RouteEvaluatorManager(
      classifier as unknown as ClassifierManager,
      registryRepo as unknown as RouterModelRegistryRepository,
      scorer as unknown as ScoringEngineManager,
      circuit as unknown as CircuitBreakerManager,
    );

    // The mocked scorer returns an incomplete RoutingDecisionV2; the
    // manager's final Zod validation throws. We only care about the
    // scoring input, so swallow that downstream throw.
    await manager
      .evaluate({
        messageContent: 'help me debug this code',
        attachedFileMimeTypes: [],
        routingMode: undefined,
        policyId: undefined,
      } as any)
      .catch(() => undefined);

    const scoringInput = scorer.score?.mock.calls[0]?.[0];
    expect(scoringInput.candidates[0].learnedSuccessRate).toBeNull();
  });
});
