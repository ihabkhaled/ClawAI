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

  describe('connector-credit rate', () => {
    it('carries the rate through so the billing page can show the grant', () => {
      const parsed = planCatalogResponseSchema.safeParse([
        { ...makeCatalogEntry(), paygCreditPercentBps: 3_000 },
      ]);

      expect(parsed.success).toBe(true);
      expect(parsed.success && parsed.data[0]?.paygCreditPercentBps).toBe(3_000);
    });

    it('defaults to zero when auth has not shipped the column', () => {
      // Renders "no connector credit" rather than deriving a figure from
      // undefined. Quoting a credit ClawAI does not grant is the one failure
      // worth being conservative about.
      const parsed = planCatalogResponseSchema.safeParse([makeCatalogEntry()]);

      expect(parsed.success && parsed.data[0]?.paygCreditPercentBps).toBe(0);
    });

    it('refuses a rate above 100% of the plan price', () => {
      // A plan cannot grant more credit than it charges, and a schema drift
      // that said otherwise would advertise money nobody will receive.
      const parsed = planCatalogResponseSchema.safeParse([
        { ...makeCatalogEntry(), paygCreditPercentBps: 10_001 },
      ]);

      expect(parsed.success).toBe(false);
    });

    it('refuses a negative or fractional rate', () => {
      for (const bps of [-1, 12.5]) {
        expect(
          planCatalogResponseSchema.safeParse([
            { ...makeCatalogEntry(), paygCreditPercentBps: bps },
          ]).success,
        ).toBe(false);
      }
    });
  });
});
