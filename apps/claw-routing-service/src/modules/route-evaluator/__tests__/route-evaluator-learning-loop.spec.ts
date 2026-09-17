import { vi, type Mocked, type Mock } from 'vitest';
// Phase 9 — Learning loop integration test. Exercises the path that
// flows learned-score data from LearningLoopManager into the scoring
// engine's learnedSuccessRate input.

import { AppConfig } from '../../../app/config/app.config';
import { DomainTag } from '../../../generated/prisma';
import type { ClassifierManager } from '../../classifier/managers/classifier.manager';
import type { LearningLoopManager } from '../../learning-loop/managers/learning-loop.manager';
import type { CircuitBreakerManager } from '../../reliability/managers/circuit-breaker.manager';
import type { RouterModelRegistryRepository } from '../../router-models/repositories/router-model-registry.repository';
import type { ScoringEngineManager } from '../../scoring/managers/scoring-engine.manager';
import { RouteEvaluatorManager } from '../managers/route-evaluator.manager';

// AppConfig is a class with a STATIC get(); the bare automock does not give
// that static a settable mock, so the manager's defensive try/catch swallowed
// the undefined read and every candidate came back with a null learned score.
vi.mock('../../../app/config/app.config', () => ({
  AppConfig: { get: vi.fn() },
}));

const mockedGetConfig = AppConfig.get as Mock;

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
  let classifier: Mocked<Partial<ClassifierManager>>;
  let registryRepo: { list: Mock };
  let scorer: Mocked<Partial<ScoringEngineManager>>;
  let circuit: { getState: Mock };
  let learningLoop: { getRollingScore: Mock };

  beforeEach(() => {
    classifier = {
      classify: vi.fn().mockReturnValue({
        domain: DomainTag.CODING,
        secondaryDomain: null,
        modalityIn: ['TEXT'],
        modalityOut: ['TEXT'],
        riskLevel: 'LOW',
        privacyClass: 'PUBLIC',
        confidence: 0.9,
        reasonTags: ['coding'],
      }),
    } as unknown as Mocked<Partial<ClassifierManager>>;
    registryRepo = {
      list: vi.fn().mockResolvedValue({
        items: [makeProfile('OPENAI', 'gpt-4o'), makeProfile('ANTHROPIC', 'claude-sonnet-4')],
      }),
    };
    scorer = {
      score: vi.fn().mockReturnValue({
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
    } as unknown as Mocked<Partial<ScoringEngineManager>>;
    circuit = {
      getState: vi.fn().mockResolvedValue({ isAvailable: true }),
    };
    learningLoop = {
      getRollingScore: vi.fn().mockResolvedValue(0.87),
    };
  });

  it('passes learnedSuccessRate=null when the flag is OFF (back-compat)', async () => {
    mockedGetConfig.mockReturnValue({
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

    const scoringInput = ((scorer.score as unknown) as Mock).mock.calls[0]?.[0];
    expect(scoringInput.candidates[0].learnedSuccessRate).toBeNull();
    expect(scoringInput.candidates[1].learnedSuccessRate).toBeNull();
    expect(learningLoop.getRollingScore).not.toHaveBeenCalled();
  });

  it('passes the learned score from LearningLoopManager when the flag is ON', async () => {
    mockedGetConfig.mockReturnValue({
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

    const scoringInput = ((scorer.score as unknown) as Mock).mock.calls[0]?.[0];
    expect(scoringInput.candidates[0].learnedSuccessRate).toBe(0.87);
    expect(learningLoop.getRollingScore).toHaveBeenCalledWith(
      'OPENAI/gpt-4o',
      DomainTag.CODING,
      'default',
    );
  });

  it('falls back to null when LearningLoopManager throws (never poisons routing)', async () => {
    mockedGetConfig.mockReturnValue({
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

    const scoringInput = ((scorer.score as unknown) as Mock).mock.calls[0]?.[0];
    expect(scoringInput.candidates[0].learnedSuccessRate).toBeNull();
  });

  it('keeps learnedSuccessRate=null when LearningLoopManager is not provided', async () => {
    mockedGetConfig.mockReturnValue({
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

    const scoringInput = ((scorer.score as unknown) as Mock).mock.calls[0]?.[0];
    expect(scoringInput.candidates[0].learnedSuccessRate).toBeNull();
  });
});
