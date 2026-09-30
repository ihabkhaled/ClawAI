import { type Mocked, vi } from 'vitest';
import { BillingIntervalKind } from '../../../../generated/prisma';
import { PlanIntervalPricingService } from '../plan-interval-pricing.service';
import type { PlanBillingRepository } from '../../repositories/plan-billing.repository';
import type { PlansRepository } from '../../repositories/plans.repository';

const plan = (overrides: Record<string, unknown> = {}): unknown => ({
  id: 'p1',
  quarterlyDiscountBps: 1000,
  semiannualDiscountBps: 1500,
  yearlyDiscountBps: 2000,
  ...overrides,
});

const price = (interval: BillingIntervalKind, amountMinor: number, currency = 'USD'): unknown => ({
  id: `${interval}-id`,
  planId: 'p1',
  billingInterval: interval,
  currency,
  amountMinor,
  version: 1,
  isActive: true,
  effectiveFrom: new Date('2026-09-30T00:00:00Z'),
  retiredAt: null,
  createdAt: new Date('2026-09-30T00:00:00Z'),
});

describe('PlanIntervalPricingService', () => {
  let plans: Mocked<Pick<PlansRepository, 'findById'>>;
  let billing: Mocked<Pick<PlanBillingRepository, 'findActivePrice' | 'publishPriceSet'>>;
  let service: PlanIntervalPricingService;

  beforeEach(() => {
    plans = { findById: vi.fn() } as never;
    billing = { findActivePrice: vi.fn(), publishPriceSet: vi.fn() } as never;
    service = new PlanIntervalPricingService(
      plans as unknown as PlansRepository,
      billing as unknown as PlanBillingRepository,
    );
  });

  describe('setDiscounts', () => {
    it('stores the discounts and re-derives all three terms from the active monthly price', async () => {
      plans.findById.mockResolvedValue(plan() as never);
      billing.findActivePrice.mockImplementation(((_id: string, interval: BillingIntervalKind) =>
        Promise.resolve(
          interval === BillingIntervalKind.MONTHLY
            ? price(BillingIntervalKind.MONTHLY, 1200)
            : null,
        )) as never);
      billing.publishPriceSet.mockResolvedValue([] as never);

      await service.setDiscounts(
        'p1',
        { quarterlyDiscountBps: 500, semiannualDiscountBps: 1000, yearlyDiscountBps: 2500 },
        'admin-1',
      );

      expect(billing.publishPriceSet).toHaveBeenCalledWith({
        planId: 'p1',
        entries: [
          { billingInterval: 'QUARTERLY', currency: 'USD', amountMinor: 3420, force: false },
          { billingInterval: 'SEMIANNUAL', currency: 'USD', amountMinor: 6480, force: false },
          { billingInterval: 'YEARLY', currency: 'USD', amountMinor: 10800, force: false },
        ],
        discounts: {
          quarterlyDiscountBps: 500,
          semiannualDiscountBps: 1000,
          yearlyDiscountBps: 2500,
        },
        legacyDisplay: { priceMonthly: 12, priceYearly: 108 },
        createdByUserId: 'admin-1',
      });
    });

    it('refuses when the plan has no monthly price yet', async () => {
      plans.findById.mockResolvedValue(plan() as never);
      billing.findActivePrice.mockResolvedValue(null as never);

      await expect(
        service.setDiscounts(
          'p1',
          { quarterlyDiscountBps: 0, semiannualDiscountBps: 0, yearlyDiscountBps: 0 },
          'admin-1',
        ),
      ).rejects.toMatchObject({ code: 'PLAN_HAS_NO_MONTHLY_PRICE' });
      expect(billing.publishPriceSet).not.toHaveBeenCalled();
    });

    it('404s for an unknown plan', async () => {
      plans.findById.mockResolvedValue(null);

      await expect(
        service.setDiscounts(
          'nope',
          { quarterlyDiscountBps: 0, semiannualDiscountBps: 0, yearlyDiscountBps: 0 },
          'admin-1',
        ),
      ).rejects.toMatchObject({ code: 'ENTITY_NOT_FOUND' });
    });

    it('follows the monthly currency, not USD', async () => {
      plans.findById.mockResolvedValue(plan() as never);
      billing.findActivePrice.mockImplementation(((_id: string, interval: BillingIntervalKind) =>
        Promise.resolve(
          interval === BillingIntervalKind.MONTHLY
            ? price(BillingIntervalKind.MONTHLY, 30000, 'EGP')
            : null,
        )) as never);
      billing.publishPriceSet.mockResolvedValue([] as never);

      await service.setDiscounts(
        'p1',
        { quarterlyDiscountBps: 1000, semiannualDiscountBps: 1500, yearlyDiscountBps: 2000 },
        'admin-1',
      );

      const call = billing.publishPriceSet.mock.calls[0]?.[0];
      expect(call?.entries.every((entry) => entry.currency === 'EGP')).toBe(true);
    });
  });

  describe('publishMonthly for a free (0) plan', () => {
    it('does not create paid terms the plan never had', async () => {
      plans.findById.mockResolvedValue(plan() as never);
      billing.findActivePrice.mockResolvedValue(null as never);
      billing.publishPriceSet.mockResolvedValue([price(BillingIntervalKind.MONTHLY, 0)] as never);

      await service.publishMonthly({
        planId: 'p1',
        currency: 'USD',
        amountMinor: 0,
        createdByUserId: 'admin-1',
      });

      const call = billing.publishPriceSet.mock.calls[0]?.[0];
      expect(call?.entries.map((entry) => entry.billingInterval)).toEqual(['MONTHLY']);
    });
  });
});
