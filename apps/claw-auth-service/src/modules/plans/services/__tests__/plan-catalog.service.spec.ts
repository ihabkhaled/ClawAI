import { type Mocked, vi } from 'vitest';
import { BillingIntervalKind, PlanFeatureKey } from '../../../../generated/prisma';
import { PlanCatalogService } from '../plan-catalog.service';
import { PlanIntervalPricingService } from '../plan-interval-pricing.service';
import type { PlanBillingRepository } from '../../repositories/plan-billing.repository';
import type { PlansRepository } from '../../repositories/plans.repository';

type PlanRow = Record<string, unknown>;

function makePlan(overrides: PlanRow = {}): PlanRow {
  return {
    id: 'plan-pro',
    slug: 'pro',
    name: 'Pro',
    description: 'For daily use',
    displayOrder: 2,
    isDefault: false,
    isActive: true,
    isPublic: true,
    dailyTokenQuota: 100_000,
    weeklyTokenQuota: null,
    monthlyTokenQuota: null,
    maxChatsPerDay: 50,
    maxMessagesPerDay: null,
    maxWorkspaceConnections: null,
    maxContextPacks: null,
    maxMemoryItems: null,
    maxVideoSeconds: 600,
    creditConnectorFreeRequestsPerMonth: 0,
    // Margin control. Must never reach the payment service or a customer.
    monthlyProviderCostCeilingMicroUsd: BigInt(5_000_000),
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
    allowImageGeneration: true,
    allowHelperVision: true,
    allowTextToSpeech: true,
    quarterlyDiscountBps: 1000,
    semiannualDiscountBps: 1500,
    yearlyDiscountBps: 2000,
    ...overrides,
  };
}

function makePrice(overrides: PlanRow = {}): PlanRow {
  return {
    id: 'ppv-1',
    planId: 'plan-pro',
    billingInterval: BillingIntervalKind.MONTHLY,
    currency: 'USD',
    amountMinor: 1999,
    version: 3,
    isActive: true,
    activeKey: 'plan-pro:MONTHLY',
    retiredAt: null,
    createdByUserId: null,
    effectiveFrom: new Date('2026-07-01T00:00:00.000Z'),
    createdAt: new Date('2026-07-01T00:00:00.000Z'),
    ...overrides,
  };
}

describe('PlanCatalogService', () => {
  let plans: Mocked<Pick<PlansRepository, 'findAll' | 'findById'>>;
  let billing: Mocked<
    Pick<
      PlanBillingRepository,
      | 'listActivePrices'
      | 'listFeatureRules'
      | 'findActivePrice'
      | 'findPriceById'
      | 'listPricesForPlan'
      | 'publishNewPrice'
      | 'publishPriceSet'
    >
  >;
  let service: PlanCatalogService;

  beforeEach(() => {
    plans = { findAll: vi.fn(), findById: vi.fn() } as never;
    billing = {
      listActivePrices: vi.fn(),
      listFeatureRules: vi.fn(),
      findActivePrice: vi.fn(),
      findPriceById: vi.fn(),
      listPricesForPlan: vi.fn(),
      publishNewPrice: vi.fn(),
      publishPriceSet: vi.fn(),
    } as never;
    service = new PlanCatalogService(
      plans as unknown as PlansRepository,
      billing as unknown as PlanBillingRepository,
      new PlanIntervalPricingService(
        plans as unknown as PlansRepository,
        billing as unknown as PlanBillingRepository,
      ),
    );
  });

  describe('listCatalog', () => {
    it('never leaks the provider cost ceiling', async () => {
      // This field is how much provider spend a plan may burn before it stops
      // being profitable. Publishing it would hand competitors our margins and
      // hand customers a number they would read as a hidden limit.
      plans.findAll.mockResolvedValue([makePlan()] as never);
      billing.listActivePrices.mockResolvedValue([makePrice()] as never);
      billing.listFeatureRules.mockResolvedValue([] as never);

      const [entry] = await service.listCatalog();

      expect(entry).toBeDefined();
      expect(JSON.stringify(entry)).not.toContain('5000000');
      expect(Object.keys(entry ?? {})).not.toContain('monthlyProviderCostCeilingMicroUsd');
    });

    it('publishes the free credit-connector allowance, keeping 0 (none) and null (unlimited) apart', async () => {
      plans.findAll.mockResolvedValue([
        makePlan({ id: 'free', slug: 'free', creditConnectorFreeRequestsPerMonth: 2 }),
        makePlan({ id: 'paid', slug: 'paid', creditConnectorFreeRequestsPerMonth: 0 }),
        makePlan({ id: 'open', slug: 'open', creditConnectorFreeRequestsPerMonth: null }),
      ] as never);
      billing.listActivePrices.mockResolvedValue([] as never);
      billing.listFeatureRules.mockResolvedValue([] as never);

      const entries = await service.listCatalog();

      expect(entries.map((entry) => entry.creditConnectorFreeRequestsPerMonth)).toEqual([
        2,
        0,
        null,
      ]);
    });

    it('offers only plans that are both active and public', async () => {
      plans.findAll.mockResolvedValue([
        makePlan({ id: 'a', isActive: true, isPublic: true }),
        makePlan({ id: 'b', isActive: false, isPublic: true }),
        makePlan({ id: 'c', isActive: true, isPublic: false }),
      ] as never);
      billing.listActivePrices.mockResolvedValue([] as never);
      billing.listFeatureRules.mockResolvedValue([] as never);

      const entries = await service.listCatalog();

      expect(entries.map((entry) => entry.id)).toEqual(['a']);
    });

    it('attaches only the prices belonging to each plan', async () => {
      plans.findAll.mockResolvedValue([makePlan({ id: 'plan-pro' })] as never);
      billing.listActivePrices.mockResolvedValue([
        makePrice({ id: 'ppv-mine', planId: 'plan-pro' }),
        makePrice({ id: 'ppv-theirs', planId: 'plan-other' }),
      ] as never);
      billing.listFeatureRules.mockResolvedValue([] as never);

      const [entry] = await service.listCatalog();

      expect(entry?.prices.map((price) => price.id)).toEqual(['ppv-mine']);
    });

    it('preserves integer minor units rather than converting to a float', async () => {
      plans.findAll.mockResolvedValue([makePlan()] as never);
      billing.listActivePrices.mockResolvedValue([makePrice({ amountMinor: 1999 })] as never);
      billing.listFeatureRules.mockResolvedValue([] as never);

      const [entry] = await service.listCatalog();

      expect(entry?.prices[0]?.amountMinor).toBe(1999);
    });

    it('carries feature rules through', async () => {
      plans.findAll.mockResolvedValue([makePlan()] as never);
      billing.listActivePrices.mockResolvedValue([] as never);
      billing.listFeatureRules.mockResolvedValue([
        {
          feature: PlanFeatureKey.COMPARE_MODE,
          accessMode: 'METERED',
          limit: 5,
          window: 'DAY',
        },
      ] as never);

      const [entry] = await service.listCatalog();

      expect(entry?.features).toEqual([
        { feature: PlanFeatureKey.COMPARE_MODE, accessMode: 'METERED', limit: 5, window: 'DAY' },
      ]);
    });

    it('publishes every plan feature gate for subscription surfaces', async () => {
      plans.findAll.mockResolvedValue([makePlan({ allowCompareMode: false })] as never);
      billing.listActivePrices.mockResolvedValue([] as never);
      billing.listFeatureRules.mockResolvedValue([] as never);

      const [entry] = await service.listCatalog();

      expect(entry?.featureGates).toEqual(
        expect.objectContaining({
          allowCompareMode: false,
          allowConsensusMode: true,
          allowRolePack: true,
          allowImageGeneration: true,
          allowHelperVision: true,
          allowTextToSpeech: true,
        }),
      );
      expect(Object.keys(entry?.featureGates ?? {})).toHaveLength(19);
    });
  });

  describe('findActivePrice', () => {
    it('returns the active price for the interval', async () => {
      billing.findActivePrice.mockResolvedValue(makePrice() as never);

      const price = await service.findActivePrice('plan-pro', BillingIntervalKind.MONTHLY);

      expect(price?.id).toBe('ppv-1');
      expect(price?.amountMinor).toBe(1999);
    });

    it('answers null rather than throwing when a plan has no price for the interval', async () => {
      // The caller is a checkout flow. "No yearly price" is a business answer
      // it must handle, not a 500.
      billing.findActivePrice.mockResolvedValue(null as never);

      await expect(
        service.findActivePrice('plan-pro', BillingIntervalKind.YEARLY),
      ).resolves.toBeNull();
    });
  });

  describe('findPriceVersion', () => {
    it('resolves a retired version, not just the active one', async () => {
      // Proration and invoice reproduction need the version the subscriber
      // actually bought, which is usually no longer active.
      billing.findPriceById.mockResolvedValue(
        makePrice({ id: 'ppv-old', isActive: false, activeKey: null, version: 1 }) as never,
      );

      const price = await service.findPriceVersion('ppv-old');

      expect(price?.isActive).toBe(false);
      expect(price?.version).toBe(1);
    });

    it('returns null for an unknown id', async () => {
      billing.findPriceById.mockResolvedValue(null as never);
      await expect(service.findPriceVersion('nope')).resolves.toBeNull();
    });
  });

  describe('admin price versions', () => {
    it('lists active and retired immutable versions for a plan', async () => {
      plans.findById.mockResolvedValue(makePlan() as never);
      billing.listPricesForPlan.mockResolvedValue([
        makePrice({ id: 'price-current', version: 2 }),
        makePrice({ id: 'price-retired', version: 1, isActive: false }),
      ] as never);

      const prices = await service.listPriceVersions('plan-pro');

      expect(prices.map((price) => price.id)).toEqual(['price-current', 'price-retired']);
    });

    it('mints the monthly version and the derived terms in one repository call', async () => {
      plans.findById.mockResolvedValue(makePlan() as never);
      billing.publishPriceSet.mockResolvedValue([
        makePrice({ id: 'price-v4', version: 4 }),
      ] as never);

      const price = await service.publishPrice({
        planId: 'plan-pro',
        billingInterval: BillingIntervalKind.MONTHLY,
        currency: 'USD',
        amountMinor: 1200,
        createdByUserId: 'admin-1',
      });

      // $12.00 a month: 10% off 3 months, 15% off 6, 20% off 12.
      expect(billing.publishPriceSet).toHaveBeenCalledWith({
        planId: 'plan-pro',
        entries: [
          { billingInterval: 'MONTHLY', currency: 'USD', amountMinor: 1200, force: true },
          { billingInterval: 'QUARTERLY', currency: 'USD', amountMinor: 3240, force: false },
          { billingInterval: 'SEMIANNUAL', currency: 'USD', amountMinor: 6120, force: false },
          { billingInterval: 'YEARLY', currency: 'USD', amountMinor: 11520, force: false },
        ],
        legacyDisplay: { priceMonthly: 12, priceYearly: 115.2 },
        createdByUserId: 'admin-1',
      });
      expect(billing.publishNewPrice).not.toHaveBeenCalled();
      expect(price.version).toBe(4);
    });

    it.each([
      BillingIntervalKind.QUARTERLY,
      BillingIntervalKind.SEMIANNUAL,
      BillingIntervalKind.YEARLY,
    ])('refuses a hand-typed %s price: it is derived', async (billingInterval) => {
      plans.findById.mockResolvedValue(makePlan() as never);

      await expect(
        service.publishPrice({
          planId: 'plan-pro',
          billingInterval,
          currency: 'USD',
          amountMinor: 999_999,
          createdByUserId: 'admin-1',
        }),
      ).rejects.toMatchObject({ code: 'PLAN_INTERVAL_PRICE_DERIVED' });
      expect(billing.publishPriceSet).not.toHaveBeenCalled();
    });

    it('rejects price publication for an unknown plan', async () => {
      plans.findById.mockResolvedValue(null);

      await expect(
        service.publishPrice({
          planId: 'missing',
          billingInterval: BillingIntervalKind.MONTHLY,
          currency: 'USD',
          amountMinor: 2499,
          createdByUserId: 'admin-1',
        }),
      ).rejects.toMatchObject({ code: 'ENTITY_NOT_FOUND' });
      expect(billing.publishPriceSet).not.toHaveBeenCalled();
    });
  });
});
