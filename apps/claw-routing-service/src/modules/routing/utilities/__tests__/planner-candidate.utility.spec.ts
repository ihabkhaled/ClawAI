import {
  CostClass,
  LatencyClass,
  ModelLifecycle,
  PrivacyClass,
  QualityTier,
} from '../../../../generated/prisma';
import { type RouterModelRegistryRecord } from '../../../router-models/types/router-model-registry.types';
import { orderCandidatesForPrompt, toPlannerCandidate } from '../planner-candidate.utility';

function record(overrides: Partial<RouterModelRegistryRecord> = {}): RouterModelRegistryRecord {
  return {
    id: 'r1',
    provider: 'OPENAI',
    modelKey: 'gpt-5',
    displayName: 'GPT 5',
    family: null,
    connectorId: null,
    runtimeId: null,
    isLocal: false,
    isRouterOnly: false,
    isExecutionCapable: true,
    lifecycle: ModelLifecycle.ACTIVE,
    modalitiesIn: [],
    modalitiesOut: [],
    contextWindowTokens: 200_000,
    maxOutputTokens: null,
    domainTags: [],
    notRecommendedFor: [],
    inputCostPer1M: '3.5',
    outputCostPer1M: '11',
    costConfidence: 'HIGH' as never,
    costClass: CostClass.PREMIUM,
    latencyP50Ms: null,
    latencyP95Ms: null,
    latencyClass: LatencyClass.MEDIUM,
    qualityTier: QualityTier.A,
    hallucinationRisk: null,
    judgeSuitability: true,
    searchSuitability: true,
    fallbackSuitability: true,
    privacySupport: PrivacyClass.CLOUD_PERMITTED,
    metadataSource: 'test',
    externalCardUrl: null,
    notes: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSyncedAt: null,
    supportsStreaming: true,
    supportsTools: true,
    supportsStructuredOutput: true,
    supportsVision: false,
    supportsAudioInput: false,
    supportsAudioOutput: false,
    supportsVideoInput: false,
    supportsFileInput: false,
    supportsEmbeddings: false,
    supportsLongContext: true,
    maxContextTokens: null,
    ...overrides,
  } as RouterModelRegistryRecord;
}

describe('toPlannerCandidate', () => {
  it('carries the economics the prompt asks the planner to weigh', () => {
    // The planner's prompt asks for cost, tier, latency and privacy. It used
    // to receive a bare provider/model pair with all of it blank.
    const candidate = toPlannerCandidate(record(), 0);

    expect(candidate.costClass).toBe(CostClass.PREMIUM);
    expect(candidate.qualityTier).toBe(QualityTier.A);
    expect(candidate.latencyClass).toBe(LatencyClass.MEDIUM);
    expect(candidate.inputCostPer1M).toBe(3.5);
    expect(candidate.outputCostPer1M).toBe(11);
    expect(candidate.contextWindowTokens).toBe(200_000);
  });

  it('marks a local model as spending no credit', () => {
    // "Good enough and free" should beat "marginally better and paid", which
    // the planner cannot judge without knowing which is which.
    expect(toPlannerCandidate(record({ isLocal: true }), 0).requiresCredit).toBe(false);
    expect(toPlannerCandidate(record({ isLocal: false }), 0).requiresCredit).toBe(true);
  });

  it('treats an unknown cost as unknown, not as free', () => {
    // Defaulting a missing price to 0 would make every unpriced model look
    // like the cheapest option on the list.
    const candidate = toPlannerCandidate(record({ inputCostPer1M: null }), 0);
    expect(candidate.inputCostPer1M).toBeNull();
  });

  it('passes the load signal through for tie-breaking', () => {
    expect(toPlannerCandidate(record(), 3).inFlightCount).toBe(3);
  });
});

describe('orderCandidatesForPrompt', () => {
  it('keeps the deterministic pick when the list is truncated', () => {
    // Ordering decides what the planner may even consider. Losing the
    // deterministic choice to the cap would make the AI plan strictly worse
    // than the routing it is meant to improve.
    const many = Array.from({ length: 40 }, (_, i) =>
      toPlannerCandidate(record({ provider: 'OPENAI', modelKey: `m${i}` }), 0),
    );
    const ordered = orderCandidatesForPrompt(many, new Set(['OPENAI::m39']), 5);

    expect(ordered).toHaveLength(5);
    expect(ordered[0]?.model).toBe('m39');
  });
});
