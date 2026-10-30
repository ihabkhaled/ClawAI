import { vi } from 'vitest';

const seeder = require('../plan-call-limits.seeder.cjs');

type Where = { slug: string } & Record<string, unknown>;

// A plan table that honours `where: { column: null }` the way Prisma does.
function fakePrisma(rows: Record<string, Record<string, unknown>>): {
  prisma: { plan: { updateMany: ReturnType<typeof vi.fn> } };
  rows: Record<string, Record<string, unknown>>;
} {
  const updateMany = vi.fn(
    async ({ where, data }: { where: Where; data: Record<string, unknown> }) => {
      const row = rows[where.slug];
      const [column] = Object.keys(data);
      if (row === undefined || column === undefined || row[column] !== null) {
        return { count: 0 };
      }
      row[column] = data[column];
      return { count: 1 };
    },
  );
  return { prisma: { plan: { updateMany } }, rows };
}

const emptyRow = (): Record<string, unknown> => ({
  maxInputTokensPerCall: null,
  maxOutputTokensPerCall: null,
  maxCostPerCallMicroUsd: null,
});

describe('plan-call-limits seeder', () => {
  it('derives every plan cap as 10% of the monthly ceiling at most', () => {
    const ceilings: Record<string, number> = {
      free: 300_000,
      starter: 1_500_000,
      plus: 3_000_000,
      pro: 5_000_000,
      team: 12_500_000,
      scale: 25_000_000,
      unlimited: 50_000_000,
    };
    for (const limit of seeder.payload) {
      expect(limit.maxCostMicroUsd).toBe(ceilings[limit.slug] / 10);
    }
  });

  it('caps input at 200,000 tokens so no plan crosses a long-context price tier', () => {
    for (const limit of seeder.payload) {
      expect(limit.maxInput).toBeLessThanOrEqual(200_000);
    }
  });

  it('covers the seven public plans in order of size', () => {
    expect(seeder.payload.map((l: { slug: string }) => l.slug)).toEqual([
      'free',
      'starter',
      'plus',
      'pro',
      'team',
      'scale',
      'unlimited',
    ]);
    const costs = seeder.payload.map((l: { maxCostMicroUsd: number }) => l.maxCostMicroUsd);
    expect([...costs].sort((a: number, b: number) => a - b)).toEqual(costs);
  });

  it('fills a NULL column and writes the cost as a BigInt', async () => {
    const { prisma, rows } = fakePrisma({ free: emptyRow() });

    await seeder.run(
      prisma,
      seeder.payload.filter((l: { slug: string }) => l.slug === 'free'),
    );

    expect(rows['free']).toEqual({
      maxInputTokensPerCall: 16_000,
      maxOutputTokensPerCall: 2_000,
      maxCostPerCallMicroUsd: 30_000n,
    });
  });

  it('never overwrites a value an administrator set, including 0', async () => {
    const { prisma, rows } = fakePrisma({
      pro: { ...emptyRow(), maxInputTokensPerCall: 0, maxCostPerCallMicroUsd: 777n },
    });

    await seeder.run(
      prisma,
      seeder.payload.filter((l: { slug: string }) => l.slug === 'pro'),
    );

    expect(rows['pro']).toEqual({
      maxInputTokensPerCall: 0,
      maxOutputTokensPerCall: 16_000,
      maxCostPerCallMicroUsd: 777n,
    });
  });

  it('is idempotent: a second run writes nothing', async () => {
    const { prisma } = fakePrisma({ team: emptyRow() });
    const team = seeder.payload.filter((l: { slug: string }) => l.slug === 'team');

    expect((await seeder.run(prisma, team)).applied).toBe(1);
    expect((await seeder.run(prisma, team)).applied).toBe(0);
  });
});
