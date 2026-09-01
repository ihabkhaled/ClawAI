const { run } = require('../plan-quarterly-semiannual-pricing.seeder.cjs');

type PlanRow = { id: string; slug: string };
type PriceVersionRow = {
  id: string;
  planId: string;
  billingInterval: string;
  amountMinor: number;
  currency: string;
  isActive: boolean;
};

function makePrisma(options: {
  plans: PlanRow[];
  activeMonthlyByPlanId: Record<string, PriceVersionRow | undefined>;
  existingActiveKeys?: Set<string>;
}): {
  prisma: {
    plan: { findMany: jest.Mock };
    planPriceVersion: { findFirst: jest.Mock; findUnique: jest.Mock; create: jest.Mock };
  };
  createCalls: Array<{ data: Record<string, unknown> }>;
} {
  const existingActiveKeys = options.existingActiveKeys ?? new Set<string>();
  const createCalls: Array<{ data: Record<string, unknown> }> = [];

  const prisma = {
    plan: {
      findMany: jest.fn().mockResolvedValue(options.plans),
    },
    planPriceVersion: {
      findFirst: jest.fn(({ where }: { where: { planId: string } }) =>
        Promise.resolve(options.activeMonthlyByPlanId[where.planId] ?? null),
      ),
      findUnique: jest.fn(({ where }: { where: { activeKey: string } }) =>
        Promise.resolve(existingActiveKeys.has(where.activeKey) ? { id: 'existing' } : null),
      ),
      create: jest.fn((args: { data: Record<string, unknown> }) => {
        createCalls.push(args);
        return Promise.resolve({ id: 'new', ...args.data });
      }),
    },
  };

  return { prisma, createCalls };
}

describe('plan-quarterly-semiannual-pricing seeder', () => {
  it('creates QUARTERLY and SEMIANNUAL rows keyed on the ACTIVE monthly price, not a hardcoded value', async () => {
    const { prisma, createCalls } = makePrisma({
      plans: [{ id: 'plan-1', slug: 'starter' }],
      activeMonthlyByPlanId: {
        // Plan re-priced by an operator since the JSON catalog shipped: 1200,
        // not whatever plan-catalog.json originally seeded.
        'plan-1': {
          id: 'price-1',
          planId: 'plan-1',
          billingInterval: 'MONTHLY',
          amountMinor: 1200,
          currency: 'USD',
          isActive: true,
        },
      },
    });

    await run(prisma);

    expect(createCalls).toHaveLength(2);
    const quarterly = createCalls.find((call) => call.data['billingInterval'] === 'QUARTERLY');
    const semiannual = createCalls.find((call) => call.data['billingInterval'] === 'SEMIANNUAL');

    // 1200 * 3 * 0.9 = 3240; 1200 * 6 * 0.9 = 6480
    expect(quarterly?.data['amountMinor']).toBe(3240);
    expect(semiannual?.data['amountMinor']).toBe(6480);
    expect(quarterly?.data['activeKey']).toBe('plan-1:QUARTERLY');
    expect(semiannual?.data['activeKey']).toBe('plan-1:SEMIANNUAL');
  });

  it('skips a plan with no active MONTHLY price and does not throw', async () => {
    const { prisma, createCalls } = makePrisma({
      plans: [{ id: 'plan-2', slug: 'priceless' }],
      activeMonthlyByPlanId: {},
    });

    await expect(run(prisma)).resolves.not.toThrow();
    expect(createCalls).toHaveLength(0);
  });

  it('is idempotent: skips an interval whose activeKey already exists', async () => {
    const { prisma, createCalls } = makePrisma({
      plans: [{ id: 'plan-3', slug: 'pro' }],
      activeMonthlyByPlanId: {
        'plan-3': {
          id: 'price-3',
          planId: 'plan-3',
          billingInterval: 'MONTHLY',
          amountMinor: 2000,
          currency: 'USD',
          isActive: true,
        },
      },
      existingActiveKeys: new Set(['plan-3:QUARTERLY']),
    });

    await run(prisma);

    expect(createCalls).toHaveLength(1);
    expect(createCalls[0]?.data['billingInterval']).toBe('SEMIANNUAL');
  });
});
