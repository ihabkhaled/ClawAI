import { ModelLifecycle } from '../../../generated/prisma';
import { type RouterModelRegistryRecord } from '../../router-models/types/router-model-registry.types';
import { applyRouteOnlyContract } from '../utilities/route-only-guard.utility';

function fake(overrides: Partial<RouterModelRegistryRecord> = {}): RouterModelRegistryRecord {
  return {
    id: 'r1',
    provider: 'OPENAI',
    modelKey: 'gpt-4o',
    displayName: 'GPT-4o',
    family: null,
    connectorId: null,
    runtimeId: null,
    isLocal: false,
    isRouterOnly: false,
    isExecutionCapable: true,
    lifecycle: ModelLifecycle.ACTIVE,
    modalitiesIn: [],
    modalitiesOut: [],
    contextWindowTokens: null,
    maxOutputTokens: null,
    domainTags: [],
    notRecommendedFor: [],
    inputCostPer1M: null,
    outputCostPer1M: null,
    costConfidence: 'EXACT' as never,
    costClass: null,
    latencyP50Ms: null,
    latencyP95Ms: null,
    latencyClass: null,
    qualityTier: 'B' as never,
    hallucinationRisk: null,
    judgeSuitability: false,
    searchSuitability: false,
    fallbackSuitability: true,
    privacySupport: 'CLOUD_PERMITTED' as never,
    metadataSource: 'seed',
    externalCardUrl: null,
    notes: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSyncedAt: null,
    ...overrides,
  };
}

describe('applyRouteOnlyContract', () => {
  it('excludes isRouterOnly=true', () => {
    const result = applyRouteOnlyContract([fake({ id: 'a', isRouterOnly: true }), fake({ id: 'b' })]);
    expect(result.map((r) => r.id)).toEqual(['b']);
  });

  it('excludes isExecutionCapable=false', () => {
    const result = applyRouteOnlyContract([
      fake({ id: 'a', isExecutionCapable: false }),
      fake({ id: 'b' }),
    ]);
    expect(result.map((r) => r.id)).toEqual(['b']);
  });

  it.each([
    ModelLifecycle.DEPRECATED,
    ModelLifecycle.DISABLED,
    ModelLifecycle.REMOVED,
    ModelLifecycle.PREVIEW,
  ])('excludes lifecycle=%s', (lifecycle) => {
    const result = applyRouteOnlyContract([fake({ id: 'a', lifecycle }), fake({ id: 'b' })]);
    expect(result.map((r) => r.id)).toEqual(['b']);
  });

  it('keeps fully-qualified candidates', () => {
    const result = applyRouteOnlyContract([
      fake({ id: 'a' }),
      fake({ id: 'b' }),
      fake({ id: 'c' }),
    ]);
    expect(result).toHaveLength(3);
  });
});
