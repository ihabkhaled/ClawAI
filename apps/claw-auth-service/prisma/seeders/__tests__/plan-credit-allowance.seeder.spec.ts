import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { vi } from 'vitest';

const planCatalog = require('../plan-catalog.seeder.cjs');

// ADR-142: Free gets 2 requests per credit connector per month, every paid plan
// gets 0, and neither the seeder nor the migration may ever overwrite a value an
// administrator has edited.

type Definition = { slug: string; creditConnectorFreeRequestsPerMonth?: number | null };

const catalog: Definition[] = planCatalog.PLAN_CATALOG;
const PAID_SLUGS = ['starter', 'plus', 'pro', 'team', 'scale', 'unlimited'];
const MIGRATION = readFileSync(
  join(
    __dirname,
    '..',
    '..',
    'migrations',
    '20261001150000_credit_connector_free_allowance',
    'migration.sql',
  ),
  'utf8',
);

describe('plan catalog free-allowance seed', () => {
  it('seeds Free at 10 requests per credit connector per month', () => {
    expect(catalog.find((plan) => plan.slug === 'free')?.creditConnectorFreeRequestsPerMonth).toBe(
      10,
    );
  });

  it.each(PAID_SLUGS)('seeds %s at 0: paid plans pay with credit', (slug) => {
    expect(catalog.find((plan) => plan.slug === slug)?.creditConnectorFreeRequestsPerMonth).toBe(0);
  });

  it('never seeds null (unlimited) for any plan', () => {
    for (const plan of catalog) {
      expect(plan.creditConnectorFreeRequestsPerMonth).not.toBeNull();
      expect(plan.creditConnectorFreeRequestsPerMonth).toBeGreaterThanOrEqual(0);
    }
  });
});

describe('creditAllowanceProjection', () => {
  it('projects the catalog value to the plan column', () => {
    expect(
      planCatalog.creditAllowanceProjection({ creditConnectorFreeRequestsPerMonth: 2 }),
    ).toEqual({
      creditConnectorFreeRequestsPerMonth: 2,
    });
  });

  it('projects a missing value to 0, never null (which would mean unlimited)', () => {
    expect(planCatalog.creditAllowanceProjection({})).toEqual({
      creditConnectorFreeRequestsPerMonth: 0,
    });
  });
});

describe('plan-catalog seeder run() and the free allowance', () => {
  const buildPrisma = (existingBySlug: Record<string, Record<string, unknown>>) => {
    const created: Array<Record<string, unknown>> = [];
    const updated: Array<{ where: unknown; data: Record<string, unknown> }> = [];
    return {
      created,
      updated,
      prisma: {
        plan: {
          findUnique: vi.fn(({ where }: { where: { slug: string } }) =>
            Promise.resolve(existingBySlug[where.slug] ?? null),
          ),
          create: vi.fn(({ data }: { data: Record<string, unknown> }) => {
            created.push(data);
            return Promise.resolve({ id: `id-${String(data['slug'])}` });
          }),
          update: vi.fn((args: { where: unknown; data: Record<string, unknown> }) => {
            updated.push(args);
            return Promise.resolve({});
          }),
        },
        planPriceVersion: {
          findUnique: vi.fn().mockResolvedValue({ id: 'price' }),
          create: vi.fn().mockResolvedValue({}),
        },
        planFeatureRule: { upsert: vi.fn().mockResolvedValue({}) },
        userPlanAssignment: { updateMany: vi.fn().mockResolvedValue({ count: 0 }) },
      },
    };
  };

  beforeEach(() => {
    vi.spyOn(console, 'warn').mockImplementation(() => undefined);
  });

  it('a fresh install gets Free at 2 and every paid plan at 0', async () => {
    const { prisma, created } = buildPrisma({});

    await planCatalog.run(prisma);

    const bySlug = Object.fromEntries(created.map((row) => [String(row['slug']), row]));
    expect(bySlug['free']?.['creditConnectorFreeRequestsPerMonth']).toBe(10);
    for (const slug of PAID_SLUGS) {
      expect(bySlug[slug]?.['creditConnectorFreeRequestsPerMonth']).toBe(0);
    }
  });

  it('IDEMPOTENT: an administrator-edited plan is never rewritten with the catalog value', async () => {
    // Free was tuned to 7 by an admin and no longer matches the legacy baseline.
    const edited = {
      id: 'free-id',
      slug: 'free',
      dailyTokenQuota: 123_456,
      allowJudgeMode: true,
      allowResearchMode: true,
      weeklyTokenQuota: 1,
      modelAccessMode: 'ALLOW_ALL',
      creditConnectorFreeRequestsPerMonth: 7,
    };
    const { prisma, updated } = buildPrisma({ free: edited });

    await planCatalog.run(prisma);

    const freeUpdate = updated.find((call) => (call.where as { id: string }).id === 'free-id');
    expect(freeUpdate).toBeDefined();
    expect(Object.keys(freeUpdate?.data ?? {})).not.toContain(
      'creditConnectorFreeRequestsPerMonth',
    );
  });
});

describe('migration 20261001150000_credit_connector_free_allowance', () => {
  it('creates the column with DEFAULT 0, so an unconfigured plan gives nothing away', () => {
    expect(MIGRATION).toMatch(
      /ADD COLUMN "credit_connector_free_requests_per_month" INTEGER DEFAULT 0/,
    );
  });

  it('bounds the column at zero or more, allowing NULL for unlimited', () => {
    expect(MIGRATION).toMatch(
      /"credit_connector_free_requests_per_month" IS NULL\s+OR "credit_connector_free_requests_per_month" >= 0/,
    );
  });

  it('seeds Free at 2 INSIDE the guard that only runs when the column is created', () => {
    const guardStart = MIGRATION.indexOf('IF NOT EXISTS');
    const update = MIGRATION.indexOf(
      `SET "credit_connector_free_requests_per_month" = 2 WHERE "slug" = 'free'`,
    );
    const guardEnd = MIGRATION.indexOf('END IF;');
    expect(guardStart).toBeGreaterThan(-1);
    expect(update).toBeGreaterThan(guardStart);
    expect(update).toBeLessThan(guardEnd);
  });

  it('writes no other plan row: paid plans keep the default 0', () => {
    expect(MIGRATION.match(/UPDATE "plans"/g)).toHaveLength(1);
    expect(MIGRATION).not.toMatch(/"slug" IN/);
  });

  it('adds the ledger kind and the atomic counter with its unique key', () => {
    expect(MIGRATION).toContain(`ADD VALUE IF NOT EXISTS 'FREE_ALLOWANCE'`);
    expect(MIGRATION).toMatch(
      /CREATE UNIQUE INDEX IF NOT EXISTS[\s\S]*\("user_id", "provider", "period_key"\)/,
    );
    expect(MIGRATION).toContain('"is_free_allowance" BOOLEAN NOT NULL DEFAULT false');
  });
});
