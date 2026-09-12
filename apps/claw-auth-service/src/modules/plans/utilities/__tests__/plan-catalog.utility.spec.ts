import { type Plan } from '../../../../generated/prisma';
import { toCatalogEntry } from '../plan-catalog.utility';

function plan(overrides: Partial<Plan> = {}): Plan {
  return {
    id: 'plan-1',
    name: 'Pro',
    slug: 'pro',
    description: 'For heavy use',
    priceMonthly: null,
    priceYearly: null,
    currency: 'USD',
    displayOrder: 3,
    isDefault: false,
    isPopular: true,
    popularKey: 'popular',
    isTrial: false,
    trialDurationDays: null,
    isActive: true,
    isPublic: true,
    lifecycleStatus: 'ACTIVE',
    replacementPlanId: null,
    retiredAt: null,
    dailyTokenQuota: 500_000,
    weeklyTokenQuota: 2_000_000,
    monthlyTokenQuota: 5_000_000,
    // The number that must never be published.
    monthlyProviderCostCeilingMicroUsd: 5_000_000n,
    paygCreditPercentBps: 2500,
    maxConcurrentRequests: 5,
    maxChatsPerDay: 75,
    maxMessagesPerDay: 750,
    maxWorkspaceConnections: null,
    maxContextPacks: null,
    maxMemoryItems: null,
    allowCompareMode: true,
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
    modelAccessMode: 'ALLOW_ALL',
    allowedCostClasses: [],
    createdAt: new Date('2026-01-01'),
    updatedAt: new Date('2026-01-01'),
    ...overrides,
  } as Plan;
}

describe('toCatalogEntry', () => {
  // The public pricing page could not state the connector-credit offer at all:
  // the projection never emitted the ratio, so the frontend defaulted it to 0
  // and every plan advertised "0% becomes credit".
  it('publishes the PAYG credit ratio, which the pricing page needs', () => {
    expect(toCatalogEntry(plan(), [], []).paygCreditPercentBps).toBe(2500);
  });

  it('publishes the customer-facing plan facts', () => {
    const entry = toCatalogEntry(
      plan({ currency: 'EUR', isTrial: true, trialDurationDays: 30, isPublic: false }),
      [],
      [],
    );

    expect(entry.currency).toBe('EUR');
    expect(entry.isTrial).toBe(true);
    expect(entry.trialDurationDays).toBe(30);
    expect(entry.isPublic).toBe(false);
    expect(entry.isActive).toBe(true);
  });

  it('publishes all three quota windows', () => {
    const entry = toCatalogEntry(plan(), [], []);
    expect(entry.dailyTokenQuota).toBe(500_000);
    expect(entry.weeklyTokenQuota).toBe(2_000_000);
    expect(entry.monthlyTokenQuota).toBe(5_000_000);
  });

  // Rule 37: the fair-use ceiling is a margin control and must never leave the
  // service. The projection is an explicit field list precisely so that adding
  // a column cannot publish it by accident.
  it('NEVER publishes the internal provider-cost ceiling', () => {
    const serialised = JSON.stringify(toCatalogEntry(plan(), [], []));

    expect(serialised).not.toContain('monthlyProviderCostCeiling');
    expect(serialised).not.toContain('5000000000');
    expect(
      (toCatalogEntry(plan(), [], []) as Record<string, unknown>)[
        'monthlyProviderCostCeilingMicroUsd'
      ],
    ).toBeUndefined();
  });

  it('keeps null distinct from zero on an unlimited quota', () => {
    const entry = toCatalogEntry(plan({ monthlyTokenQuota: null, maxChatsPerDay: 0 }), [], []);

    // null means unlimited, 0 means disabled — never interchangeable.
    expect(entry.monthlyTokenQuota).toBeNull();
    expect(entry.maxChatsPerDay).toBe(0);
  });
});
