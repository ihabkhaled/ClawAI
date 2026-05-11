import { Test, type TestingModule } from '@nestjs/testing';
import { RiskLevel } from '../../../common/enums';
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
import { ScoringEngineManager } from '../managers/scoring-engine.manager';
import { DEFAULT_POLICY_WEIGHTS } from '../constants/scoring.constants';
import {
  type ScoringCandidate,
  type ScoringClassificationInput,
  type ScoringPolicy,
} from '../types/scoring.types';
import { type RouterModelRegistryRecord } from '../../router-models/types/router-model-registry.types';

function makeProfile(
  overrides: Partial<RouterModelRegistryRecord> = {},
): RouterModelRegistryRecord {
  return {
    id: 'p1',
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
    domainTags: [DomainTag.CODING, DomainTag.LEGAL, DomainTag.MEDICAL],
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

function makeCandidate(profile: RouterModelRegistryRecord): ScoringCandidate {
  return {
    profile,
    health: { isHealthy: true, circuitOpen: false, successRateLast24h: 0.9 },
    learnedSuccessRate: null,
    judgeTrust: null,
    fallbackReliability: null,
  };
}

const defaultClassification: ScoringClassificationInput = {
  domain: DomainTag.CODING,
  secondaryDomain: null,
  modalityIn: [ModalityKind.TEXT],
  modalityOut: [ModalityKind.TEXT],
  riskLevel: RiskLevel.LOW,
  privacyClass: PrivacyClass.CLOUD_PERMITTED,
  confidence: 0.9,
};

function makePolicy(mode: RoutingMode = RoutingMode.AUTO): ScoringPolicy {
  return { policyId: 'p1', weights: DEFAULT_POLICY_WEIGHTS[mode] };
}

describe('ScoringEngineManager', () => {
  let engine: ScoringEngineManager;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ScoringEngineManager],
    }).compile();
    engine = module.get<ScoringEngineManager>(ScoringEngineManager);
  });

  describe('determinism', () => {
    it('same input twice → same output', () => {
      const candidate = makeCandidate(makeProfile());
      const a = engine.score({
        classification: defaultClassification,
        policy: makePolicy(),
        candidates: [candidate],
      });
      const b = engine.score({
        classification: defaultClassification,
        policy: makePolicy(),
        candidates: [candidate],
      });
      expect(a).toEqual(b);
    });
  });

  describe('breakdown integrity', () => {
    it('breakdown contains all 14 dimensions', () => {
      const candidate = makeCandidate(makeProfile());
      const result = engine.score({
        classification: defaultClassification,
        policy: makePolicy(),
        candidates: [candidate],
      });
      expect(result.ranked[0]!.breakdown).toHaveLength(14);
    });

    it('weighted score equals raw × weight per dimension', () => {
      const candidate = makeCandidate(makeProfile());
      const result = engine.score({
        classification: defaultClassification,
        policy: makePolicy(),
        candidates: [candidate],
      });
      for (const entry of result.ranked[0]!.breakdown) {
        const expected = Number((entry.rawScore * entry.weight).toFixed(4));
        expect(entry.weightedScore).toBeCloseTo(expected, 4);
      }
    });

    it('total score is in [0, 1]', () => {
      const candidate = makeCandidate(makeProfile());
      const result = engine.score({
        classification: defaultClassification,
        policy: makePolicy(),
        candidates: [candidate],
      });
      const total = result.ranked[0]!.totalScore;
      expect(total).toBeGreaterThanOrEqual(0);
      expect(total).toBeLessThanOrEqual(1);
    });
  });

  describe('hard rejection', () => {
    it('router-only profile is rejected', () => {
      const candidate = makeCandidate(makeProfile({ isRouterOnly: true }));
      const result = engine.score({
        classification: defaultClassification,
        policy: makePolicy(),
        candidates: [candidate],
      });
      expect(result.rejected).toHaveLength(1);
      expect(result.rejected[0]!.rejectionReason).toBe('router_only_model');
    });

    it('LOCAL_ONLY classification + non-local profile → rejected', () => {
      const candidate = makeCandidate(makeProfile({ isLocal: false }));
      const result = engine.score({
        classification: { ...defaultClassification, privacyClass: PrivacyClass.LOCAL_ONLY },
        policy: makePolicy(),
        candidates: [candidate],
      });
      expect(result.rejected[0]!.rejectionReason).toBe('privacy_class_local_only_mismatch');
    });

    it('circuit-open profile is rejected', () => {
      const candidate: ScoringCandidate = {
        ...makeCandidate(makeProfile()),
        health: { isHealthy: true, circuitOpen: true, successRateLast24h: 0.9 },
      };
      const result = engine.score({
        classification: defaultClassification,
        policy: makePolicy(),
        candidates: [candidate],
      });
      expect(result.rejected[0]!.rejectionReason).toBe('circuit_breaker_open');
    });
  });

  describe('mode behavior', () => {
    it('COST_SAVER prefers FREE-tier local over PREMIUM cloud', () => {
      const cloudPremium = makeCandidate(
        makeProfile({
          id: 'cloud-premium',
          provider: 'ANTHROPIC',
          modelKey: 'claude-opus-4',
          isLocal: false,
          costClass: CostClass.PREMIUM,
          qualityTier: QualityTier.S,
          latencyClass: LatencyClass.MEDIUM,
          domainTags: [DomainTag.CODING],
        }),
      );
      const localFree = makeCandidate(
        makeProfile({
          id: 'local-free',
          provider: 'OLLAMA',
          modelKey: 'qwen-coder',
          isLocal: true,
          costClass: CostClass.FREE,
          qualityTier: QualityTier.B,
          latencyClass: LatencyClass.FAST,
          domainTags: [DomainTag.CODING],
          inputCostPer1M: '0',
          outputCostPer1M: '0',
          costConfidence: CostConfidence.EXACT,
        }),
      );
      const result = engine.score({
        classification: defaultClassification,
        policy: makePolicy(RoutingMode.COST_SAVER),
        candidates: [cloudPremium, localFree],
      });
      expect(result.ranked[0]!.profileId).toBe('local-free');
    });

    it('HIGH_REASONING prefers S-tier over B-tier even at higher cost', () => {
      const sTier = makeCandidate(
        makeProfile({
          id: 's-tier',
          qualityTier: QualityTier.S,
          costClass: CostClass.PREMIUM,
          domainTags: [DomainTag.CODING],
        }),
      );
      const bTier = makeCandidate(
        makeProfile({
          id: 'b-tier',
          qualityTier: QualityTier.B,
          costClass: CostClass.CHEAP,
          domainTags: [DomainTag.CODING],
        }),
      );
      const result = engine.score({
        classification: defaultClassification,
        policy: makePolicy(RoutingMode.HIGH_REASONING),
        candidates: [sTier, bTier],
      });
      expect(result.ranked[0]!.profileId).toBe('s-tier');
    });

    it('LOW_LATENCY prefers FAST over SLOW', () => {
      const fast = makeCandidate(
        makeProfile({ id: 'fast', latencyClass: LatencyClass.FAST, qualityTier: QualityTier.A }),
      );
      const slow = makeCandidate(
        makeProfile({ id: 'slow', latencyClass: LatencyClass.SLOW, qualityTier: QualityTier.A }),
      );
      const result = engine.score({
        classification: defaultClassification,
        policy: makePolicy(RoutingMode.LOW_LATENCY),
        candidates: [fast, slow],
      });
      expect(result.ranked[0]!.profileId).toBe('fast');
    });

    it('PRIVACY_FIRST prefers local over cloud', () => {
      const cloud = makeCandidate(
        makeProfile({
          id: 'cloud',
          isLocal: false,
          privacySupport: PrivacyClass.CLOUD_PERMITTED,
          qualityTier: QualityTier.S,
        }),
      );
      const local = makeCandidate(
        makeProfile({
          id: 'local',
          isLocal: true,
          privacySupport: PrivacyClass.LOCAL_PREFERRED,
          qualityTier: QualityTier.B,
        }),
      );
      const result = engine.score({
        classification: { ...defaultClassification, privacyClass: PrivacyClass.LOCAL_PREFERRED },
        policy: makePolicy(RoutingMode.PRIVACY_FIRST),
        candidates: [cloud, local],
      });
      expect(result.ranked[0]!.profileId).toBe('local');
    });
  });

  describe('penalty behavior', () => {
    it('UNKNOWN cost confidence triggers uncertainty penalty (raw score 0.5)', () => {
      const candidate = makeCandidate(makeProfile({ costConfidence: CostConfidence.UNKNOWN }));
      const result = engine.score({
        classification: defaultClassification,
        policy: makePolicy(),
        candidates: [candidate],
      });
      const uncertaintyDim = result.ranked[0]!.breakdown.find(
        (b) => b.dimension === 'uncertaintyPenalty',
      );
      expect(uncertaintyDim!.rawScore).toBe(0.5);
    });

    it('HIGH risk + quality C → risk penalty raw=0.4', () => {
      const candidate = makeCandidate(makeProfile({ qualityTier: QualityTier.C }));
      const result = engine.score({
        classification: { ...defaultClassification, riskLevel: RiskLevel.HIGH },
        policy: makePolicy(),
        candidates: [candidate],
      });
      const riskDim = result.ranked[0]!.breakdown.find((b) => b.dimension === 'riskPenalty');
      expect(riskDim!.rawScore).toBe(0.4);
    });

    it('LOW risk + quality C → risk penalty raw=1.0 (no penalty)', () => {
      const candidate = makeCandidate(makeProfile({ qualityTier: QualityTier.C }));
      const result = engine.score({
        classification: { ...defaultClassification, riskLevel: RiskLevel.LOW },
        policy: makePolicy(),
        candidates: [candidate],
      });
      const riskDim = result.ranked[0]!.breakdown.find((b) => b.dimension === 'riskPenalty');
      expect(riskDim!.rawScore).toBe(1);
    });
  });

  describe('domain matching', () => {
    it('not-recommended-for domain → raw=0', () => {
      const candidate = makeCandidate(makeProfile({ notRecommendedFor: [DomainTag.MEDICAL] }));
      const result = engine.score({
        classification: { ...defaultClassification, domain: DomainTag.MEDICAL },
        policy: makePolicy(),
        candidates: [candidate],
      });
      const domainDim = result.ranked[0]!.breakdown.find((b) => b.dimension === 'domain');
      expect(domainDim!.rawScore).toBe(0);
    });

    it('primary domain match → raw=1', () => {
      const candidate = makeCandidate(makeProfile({ domainTags: [DomainTag.CODING] }));
      const result = engine.score({
        classification: defaultClassification,
        policy: makePolicy(),
        candidates: [candidate],
      });
      const domainDim = result.ranked[0]!.breakdown.find((b) => b.dimension === 'domain');
      expect(domainDim!.rawScore).toBe(1);
    });

    it('secondary domain match → raw=0.6', () => {
      const candidate = makeCandidate(makeProfile({ domainTags: [DomainTag.MARKETING] }));
      const result = engine.score({
        classification: {
          ...defaultClassification,
          domain: DomainTag.CODING,
          secondaryDomain: DomainTag.MARKETING,
        },
        policy: makePolicy(),
        candidates: [candidate],
      });
      const domainDim = result.ranked[0]!.breakdown.find((b) => b.dimension === 'domain');
      expect(domainDim!.rawScore).toBe(0.6);
    });
  });

  describe('modality matching', () => {
    it('full match → raw=1', () => {
      const candidate = makeCandidate(makeProfile());
      const result = engine.score({
        classification: defaultClassification,
        policy: makePolicy(),
        candidates: [candidate],
      });
      const modDim = result.ranked[0]!.breakdown.find((b) => b.dimension === 'modality');
      expect(modDim!.rawScore).toBe(1);
    });

    it('missing required modality → raw<1', () => {
      const candidate = makeCandidate(
        makeProfile({ modalitiesIn: [ModalityKind.TEXT], modalitiesOut: [ModalityKind.TEXT] }),
      );
      const result = engine.score({
        classification: {
          ...defaultClassification,
          modalityIn: [ModalityKind.TEXT, ModalityKind.PDF_INPUT],
        },
        policy: makePolicy(),
        candidates: [candidate],
      });
      const modDim = result.ranked[0]!.breakdown.find((b) => b.dimension === 'modality');
      expect(modDim!.rawScore).toBeLessThan(1);
    });
  });

  describe('explainability', () => {
    it('winningDimensions has top 3 by weighted score', () => {
      const candidate = makeCandidate(makeProfile());
      const result = engine.score({
        classification: defaultClassification,
        policy: makePolicy(),
        candidates: [candidate],
      });
      expect(result.ranked[0]!.winningDimensions).toHaveLength(3);
    });

    it('losingDimensions has bottom 1', () => {
      const candidate = makeCandidate(makeProfile());
      const result = engine.score({
        classification: defaultClassification,
        policy: makePolicy(),
        candidates: [candidate],
      });
      expect(result.ranked[0]!.losingDimensions).toHaveLength(1);
    });
  });

  describe('ranking', () => {
    it('orders candidates by descending totalScore', () => {
      const high = makeCandidate(
        makeProfile({ id: 'high', domainTags: [DomainTag.CODING], qualityTier: QualityTier.S }),
      );
      const low = makeCandidate(
        makeProfile({
          id: 'low',
          domainTags: [DomainTag.MEDICAL],
          qualityTier: QualityTier.D,
          costClass: CostClass.ULTRA,
        }),
      );
      const result = engine.score({
        classification: defaultClassification,
        policy: makePolicy(),
        candidates: [low, high],
      });
      expect(result.ranked[0]!.profileId).toBe('high');
      expect(result.ranked[1]!.profileId).toBe('low');
    });
  });
});
