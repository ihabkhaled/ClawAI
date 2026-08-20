import { planCatalogResponseSchema } from '../plan-catalog.schema';

const featureGates = {
  allowCompareMode: false,
  allowJudgeMode: true,
  allowResearchMode: true,
  allowCriticReview: true,
  allowWorkspaces: true,
  allowMemory: true,
  allowContextPacks: true,
  allowConsensusMode: true,
  allowEscalationChain: true,
  allowRepairLab: true,
  allowTaskDecomposer: true,
  allowBestOfN: true,
  allowVerifier: true,
  allowPipelineLab: true,
  allowCostEnsemble: true,
  allowRolePack: true,
};

function makeCatalogEntry(): Record<string, unknown> {
  return {
    id: 'plan-free',
    slug: 'free',
    name: 'Free',
    description: null,
    displayOrder: 0,
    isDefault: true,
    dailyTokenQuota: 300_000,
    weeklyTokenQuota: 20_000,
    monthlyTokenQuota: null,
    maxChatsPerDay: 5,
    maxMessagesPerDay: 250,
    maxWorkspaceConnections: 5,
    maxContextPacks: 10,
    maxMemoryItems: 10,
    featureGates,
    prices: [],
    features: [],
  };
}

describe('planCatalogResponseSchema', () => {
  it('accepts the complete quota and feature-gate contract', () => {
    expect(planCatalogResponseSchema.safeParse([makeCatalogEntry()]).success).toBe(true);
  });

  it('refuses a catalog entry missing a feature gate', () => {
    const entry = makeCatalogEntry();
    entry.featureGates = { ...featureGates, allowRolePack: undefined };

    expect(planCatalogResponseSchema.safeParse([entry]).success).toBe(false);
  });
});
