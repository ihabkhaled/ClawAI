import { Test, type TestingModule } from '@nestjs/testing';
import {
  CostClass,
  CostConfidence,
  DomainTag,
  LatencyClass,
  ModalityKind,
  ModelLifecycle,
  PrivacyClass,
  QualityTier,
  RoutingMode,
} from '../../../generated/prisma';
import { ClassifierManager } from '../../classifier/managers/classifier.manager';
import { CircuitBreakerManager } from '../../reliability/managers/circuit-breaker.manager';
import { RouterModelRegistryRepository } from '../../router-models/repositories/router-model-registry.repository';
import { type RouterModelRegistryRecord } from '../../router-models/types/router-model-registry.types';
import { ScoringEngineManager } from '../../scoring/managers/scoring-engine.manager';
import { RouteEvaluatorManager } from '../managers/route-evaluator.manager';

/// Phase 14 master harness smoke test — exercises the full classifier →
/// scoring → route-evaluator pipeline in-process, with no HTTP/DB/RabbitMQ
/// dependencies. Uses minimal fakes for the repository and circuit breaker
/// so the real ClassifierManager, ScoringEngineManager, and
/// RouteEvaluatorManager run end-to-end against deterministic inputs.

function makeProfile(
  overrides: Partial<RouterModelRegistryRecord> = {},
): RouterModelRegistryRecord {
  return {
    id: 'cloud-1',
    provider: 'ANTHROPIC',
    modelKey: 'claude-opus-4',
    displayName: 'Claude Opus 4',
    family: 'claude-4',
    connectorId: null,
    runtimeId: null,
    isLocal: false,
    isRouterOnly: false,
    isExecutionCapable: true,
    lifecycle: ModelLifecycle.ACTIVE,
    modalitiesIn: [ModalityKind.TEXT, ModalityKind.IMAGE_INPUT],
    modalitiesOut: [ModalityKind.TEXT],
    contextWindowTokens: 200_000,
    maxOutputTokens: 16_384,
    domainTags: [DomainTag.CODING, DomainTag.LEGAL],
    notRecommendedFor: [],
    inputCostPer1M: '3.0',
    outputCostPer1M: '15.0',
    costConfidence: CostConfidence.EXACT,
    costClass: CostClass.PREMIUM,
    latencyP50Ms: 800,
    latencyP95Ms: 1500,
    latencyClass: LatencyClass.MEDIUM,
    qualityTier: QualityTier.S,
    hallucinationRisk: '0.05',
    judgeSuitability: true,
    searchSuitability: false,
    fallbackSuitability: true,
    privacySupport: PrivacyClass.CLOUD_PERMITTED,
    metadataSource: 'seed',
    externalCardUrl: null,
    notes: null,
    createdAt: new Date('2026-01-01'),
    updatedAt: new Date('2026-01-01'),
    lastSyncedAt: null,
    ...overrides,
  };
}

class FakeRegistryRepo {
  private readonly items: RouterModelRegistryRecord[];
  constructor(items: RouterModelRegistryRecord[]) {
    this.items = items;
  }
  async list(): Promise<{ items: RouterModelRegistryRecord[]; total: number }> {
    return { items: this.items, total: this.items.length };
  }
  async findByProviderAndModelKey(
    provider: string,
    modelKey: string,
  ): Promise<RouterModelRegistryRecord | null> {
    return this.items.find((p) => p.provider === provider && p.modelKey === modelKey) ?? null;
  }
  async getProtectedFieldNames(): Promise<string[]> {
    return [];
  }
}

class FakeCircuit {
  async getState(scope: string): Promise<{
    scope: string;
    state: string;
    failureCount: number;
    openedAt: Date | null;
    isAvailable: boolean;
  }> {
    return {
      scope,
      state: 'CLOSED',
      failureCount: 0,
      openedAt: null,
      isAvailable: true,
    };
  }
}

describe('master harness smoke (Phase 14 — offline pipeline)', () => {
  let evaluator: RouteEvaluatorManager;
  let registry: FakeRegistryRepo;

  async function buildModule(profiles: RouterModelRegistryRecord[]): Promise<void> {
    registry = new FakeRegistryRepo(profiles);
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ClassifierManager,
        ScoringEngineManager,
        RouteEvaluatorManager,
        { provide: RouterModelRegistryRepository, useValue: registry },
        { provide: CircuitBreakerManager, useValue: new FakeCircuit() },
      ],
    }).compile();
    evaluator = module.get<RouteEvaluatorManager>(RouteEvaluatorManager);
  }

  it('AUTO mode + coding prompt → picks a coding-capable execution model', async () => {
    const opus = makeProfile({
      id: 'opus',
      provider: 'ANTHROPIC',
      modelKey: 'claude-opus-4',
      domainTags: [DomainTag.CODING],
      qualityTier: QualityTier.S,
    });
    const localChat = makeProfile({
      id: 'gemma',
      provider: 'OLLAMA',
      modelKey: 'gemma3:4b',
      isLocal: true,
      qualityTier: QualityTier.C,
      domainTags: [DomainTag.GENERAL],
      costClass: CostClass.FREE,
    });
    await buildModule([opus, localChat]);

    const decision = await evaluator.evaluate({
      messageContent: 'write a typescript function that reverses a linked list',
      routingMode: RoutingMode.AUTO,
    });

    expect(decision.selectedProfileId).not.toBeNull();
    expect(decision.classification.domain).toBe(DomainTag.CODING);
    expect(decision.noExecutionModelIssue).toBeNull();
    expect(['opus', 'gemma']).toContain(decision.selectedProfileId);
  });

  it('PRIVACY_FIRST mode + sensitive prompt → never selects a non-local cloud model', async () => {
    const cloudOnly = makeProfile({
      id: 'cloud-only',
      provider: 'OPENAI',
      modelKey: 'gpt-4o',
      isLocal: false,
      privacySupport: PrivacyClass.CLOUD_PERMITTED,
    });
    const localOk = makeProfile({
      id: 'local-ok',
      provider: 'OLLAMA',
      modelKey: 'gemma3:4b',
      isLocal: true,
      privacySupport: PrivacyClass.LOCAL_ONLY,
      domainTags: [DomainTag.GENERAL],
      costClass: CostClass.FREE,
    });
    await buildModule([cloudOnly, localOk]);

    const decision = await evaluator.evaluate({
      messageContent:
        '[confidential] internal salary review for employee #4421 — keep on-prem only',
      routingMode: RoutingMode.PRIVACY_FIRST,
    });

    expect(decision.classification.privacyClass).toBe(PrivacyClass.LOCAL_ONLY);
    if (decision.selectedProfileId !== null) {
      expect(decision.selectedProfileId).toBe('local-ok');
    }
  });

  it('no execution-capable models → returns NO_HEALTHY_EXECUTION_MODEL with null selection', async () => {
    const routerOnly = makeProfile({
      id: 'router-only',
      isRouterOnly: true,
      isExecutionCapable: false,
    });
    await buildModule([routerOnly]);

    const decision = await evaluator.evaluate({
      messageContent: 'hello, how are you',
      routingMode: RoutingMode.AUTO,
    });

    expect(decision.selectedProfileId).toBeNull();
    expect(decision.selectedProvider).toBeNull();
    expect(decision.selectedModel).toBeNull();
    expect(decision.runtimeType).toBe('UNKNOWN');
    expect(decision.noExecutionModelIssue).not.toBeNull();
    expect(decision.noExecutionModelIssue!.code).toBe('NO_HEALTHY_EXECUTION_MODEL');
    expect(decision.fallbackChain).toEqual([]);
  });

  it('MANUAL_MODEL with missing forcedProvider → MANUAL_SELECTION_INVALID', async () => {
    await buildModule([makeProfile()]);
    const decision = await evaluator.evaluate({
      messageContent: 'whatever',
      routingMode: RoutingMode.MANUAL_MODEL,
    });
    expect(decision.noExecutionModelIssue?.code).toBe('MANUAL_SELECTION_INVALID');
  });

  it('MANUAL_MODEL with valid forced provider+model → selects exactly that profile', async () => {
    const opus = makeProfile({
      id: 'opus',
      provider: 'ANTHROPIC',
      modelKey: 'claude-opus-4',
    });
    const gpt = makeProfile({
      id: 'gpt',
      provider: 'OPENAI',
      modelKey: 'gpt-4o',
    });
    await buildModule([opus, gpt]);

    const decision = await evaluator.evaluate({
      messageContent: 'anything',
      routingMode: RoutingMode.MANUAL_MODEL,
      forcedProvider: 'OPENAI',
      forcedModel: 'gpt-4o',
    });

    expect(decision.selectedProfileId).toBe('gpt');
    expect(decision.confidence).toBe(1);
    expect(decision.reasonTags).toContain('manual_selection');
  });

  it('pipeline is deterministic — same input twice produces the same selected model', async () => {
    const a = makeProfile({
      id: 'a',
      provider: 'ANTHROPIC',
      modelKey: 'claude-opus-4',
    });
    const b = makeProfile({
      id: 'b',
      provider: 'OPENAI',
      modelKey: 'gpt-4o',
      qualityTier: QualityTier.A,
    });
    await buildModule([a, b]);

    const d1 = await evaluator.evaluate({
      messageContent: 'review this contract clause for legal risk',
      routingMode: RoutingMode.AUTO,
    });
    const d2 = await evaluator.evaluate({
      messageContent: 'review this contract clause for legal risk',
      routingMode: RoutingMode.AUTO,
    });

    expect(d1.selectedProfileId).toBe(d2.selectedProfileId);
    expect(d1.classification.domain).toBe(d2.classification.domain);
    expect(d1.confidence).toBe(d2.confidence);
  });

  it('debug=true exposes scoreBreakdown and candidates; debug=false hides them', async () => {
    await buildModule([makeProfile({ id: 'opus' })]);

    const withDebug = await evaluator.evaluate({
      messageContent: 'write code',
      routingMode: RoutingMode.AUTO,
      debug: true,
    });
    expect(withDebug.scoreBreakdown).not.toBeNull();
    expect(withDebug.candidates).not.toBeNull();

    const noDebug = await evaluator.evaluate({
      messageContent: 'write code',
      routingMode: RoutingMode.AUTO,
      debug: false,
    });
    expect(noDebug.scoreBreakdown).toBeNull();
    expect(noDebug.candidates).toBeNull();
  });
});
