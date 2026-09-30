import { vi } from 'vitest';
import { computeIntervalPriceMinor as typescriptCompute } from '../../../src/modules/plans/utilities/plan-interval-price.utility';
const { run, computeIntervalPriceMinor } = require('../plan-interval-discounts.seeder.cjs');

type Row = {
  id: string;
  planId: string;
  billingInterval: string;
  amountMinor: number;
  currency: string;
  version: number;
  isActive: boolean;
};

const DEFAULT_DISCOUNTS = {
  quarterlyDiscountBps: 1000,
  semiannualDiscountBps: 1500,
  yearlyDiscountBps: 2000,
};

function makePrisma(active: Row[], plans = [{ id: 'p1', slug: 'pro', ...DEFAULT_DISCOUNTS }]) {
  const rows = [...active];
  const creates: Array<Record<string, unknown>> = [];
  const retired: string[] = [];
  const planUpdates: Array<Record<string, unknown>> = [];
  const tx = {
    planPriceVersion: {
      findUnique: vi.fn(({ where }: { where: { activeKey: string } }) => {
        const [planId, interval] = where.activeKey.split(':');
        return Promise.resolve(
          rows.find((r) => r.planId === planId && r.billingInterval === interval && r.isActive) ??
            null,
        );
      }),
      update: vi.fn(({ where }: { where: { id: string } }) => {
        retired.push(where.id);
        return Promise.resolve({});
      }),
      create: vi.fn(({ data }: { data: Record<string, unknown> }) => {
        creates.push(data);
        return Promise.resolve(data);
      }),
    },
    plan: {
      update: vi.fn(({ data }: { data: Record<string, unknown> }) => {
        planUpdates.push(data);
        return Promise.resolve({});
      }),
    },
  };
  const prisma = {
    plan: { findMany: vi.fn().mockResolvedValue(plans) },
    planPriceVersion: {
      findFirst: vi.fn(({ where }: { where: { planId: string; billingInterval: string } }) =>
        Promise.resolve(
          rows.find(
            (r) => r.planId === where.planId && r.billingInterval === where.billingInterval,
          ) ?? null,
        ),
      ),
    },
    $transaction: vi.fn((fn: (t: typeof tx) => Promise<unknown>) => fn(tx)),
  };
  return { prisma, creates, retired, planUpdates };
}

const row = (interval: string, amountMinor: number, version = 1): Row => ({
  id: `${interval}-${String(version)}`,
  planId: 'p1',
  billingInterval: interval,
  amountMinor,
  currency: 'USD',
  version,
  isActive: true,
});

describe('plan-interval-discounts seeder', () => {
  it('prices yearly at monthly x 12 x 80%, quarterly at 90%, semiannual at 85%', () => {
    // A $12.00 plan: yearly is 12 x 12 x 0.8 = $115.20.
    expect(computeIntervalPriceMinor(1200, 12, 2000)).toBe(11520);
    expect(computeIntervalPriceMinor(1200, 3, 1000)).toBe(3240);
    expect(computeIntervalPriceMinor(1200, 6, 1500)).toBe(6120);
  });

  it('agrees with the TypeScript price utility the runtime uses', () => {
    for (const [monthly, months, bps] of [
      [500, 3, 1000],
      [1999, 6, 1500],
      [20000, 12, 2000],
      [333, 3, 1234],
    ] as const) {
      expect(computeIntervalPriceMinor(monthly, months, bps)).toBe(
        typescriptCompute(monthly, months, bps),
      );
    }
  });

  it('retires the old versions and mints the new ones, bumping the version', async () => {
    // The old policy: yearly = 10 months, quarterly/semiannual = 10% off.
    const { prisma, creates, retired, planUpdates } = makePrisma([
      row('MONTHLY', 2000),
      row('QUARTERLY', 5400),
      row('SEMIANNUAL', 10800),
      row('YEARLY', 20000),
    ]);

    await run(prisma);

    // Quarterly was already 10% off (5400), so it is left alone.
    expect(creates.map((c) => [c['billingInterval'], c['amountMinor'], c['version']])).toEqual([
      ['SEMIANNUAL', 10200, 2],
      ['YEARLY', 19200, 2],
    ]);
    expect(retired).toEqual(['SEMIANNUAL-1', 'YEARLY-1']);
    expect(planUpdates).toEqual([{ priceMonthly: 20, priceYearly: 192 }]);
  });

  it('creates an interval that has no version yet', async () => {
    const { prisma, creates } = makePrisma([row('MONTHLY', 500)]);

    await run(prisma);

    expect(creates.map((c) => [c['billingInterval'], c['amountMinor'], c['version']])).toEqual([
      ['QUARTERLY', 1350, 1],
      ['SEMIANNUAL', 2550, 1],
      ['YEARLY', 4800, 1],
    ]);
  });

  it('is idempotent: a second run mints nothing', async () => {
    const { prisma, creates, retired } = makePrisma([
      row('MONTHLY', 2000),
      row('QUARTERLY', 5400),
      row('SEMIANNUAL', 10200),
      row('YEARLY', 19200),
    ]);

    await run(prisma);

    expect(creates).toHaveLength(0);
    expect(retired).toHaveLength(0);
  });

  it('follows a per-plan discount, not a constant', async () => {
    const { prisma, creates } = makePrisma(
      [row('MONTHLY', 1000)],
      [{ id: 'p1', slug: 'pro', ...DEFAULT_DISCOUNTS, yearlyDiscountBps: 3000 }],
    );

    await run(prisma);

    expect(creates.find((c) => c['billingInterval'] === 'YEARLY')?.['amountMinor']).toBe(8400);
  });

  it('skips a plan with no monthly price or a free one', async () => {
    const none = makePrisma([]);
    const free = makePrisma([row('MONTHLY', 0)]);

    await run(none.prisma);
    await run(free.prisma);

    expect(none.creates).toHaveLength(0);
    expect(free.creates).toHaveLength(0);
  });
});
