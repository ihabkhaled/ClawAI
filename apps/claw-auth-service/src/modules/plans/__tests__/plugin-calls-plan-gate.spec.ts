// PLUGIN_CALLS metering and the maxPluginCallsPerDay plan column
// (docs/implementation/plugins-and-mcp-design.md section 5).
//
// Owner-set daily allowance: Free 20, Starter 100, Plus 300, Pro 1000, Team and Scale 5000,
// Unlimited none. null is unlimited and 0 is disabled; they are never interchangeable.
//
// A fresh database takes the catalog through the seeder's create branch (column AND rule row);
// an upgraded database takes migrations 20261013120000 (enum value) and 20261013120100
// (column, per-tier numbers, one rule row per plan). Both are checked here because a rule that
// is absent fails CLOSED (the plan reads as disabled) and one that is too generous gives
// a Free user a free proxy.
import ENUM_MIGRATION_SQL from '../../../../prisma/migrations/20261013120000_add_plugin_calls_feature/migration.sql?raw';
import LIMITS_MIGRATION_SQL from '../../../../prisma/migrations/20261013120100_plugin_calls_plan_limits/migration.sql?raw';
import SCHEMA_PRISMA from '../../../../prisma/schema.prisma?raw';
import SEED_CJS from '../../../../prisma/seed.cjs?raw';
import catalogData from '../../../../prisma/seeders/plan-catalog.json';
import type { PlanSeederDb } from '../../../../prisma/seeders/plan-catalog.seeder.cjs';

type Rule = { accessMode: string; limit: number | null; window: string };
type CatalogEntry = {
  slug: string;
  features: Record<string, Rule>;
  plugins: { maxCallsPerDay: number | null };
};
type RuleUpsert = { create: { feature: string; planId: string }; update: Record<string, unknown> };

const catalog = catalogData.plans as unknown as CatalogEntry[];

const EXPECTED_DAILY: Record<string, number | null> = {
  free: 20,
  starter: 100,
  plus: 300,
  pro: 1000,
  team: 5000,
  scale: 5000,
  unlimited: null,
};

const makeDb = (existing: Record<string, Record<string, unknown>>) => {
  const created: Array<Record<string, unknown>> = [];
  const updated: Array<{ id: string; data: Record<string, unknown> }> = [];
  const rules: Array<Record<string, unknown>> = [];
  const db: PlanSeederDb = {
    plan: {
      findUnique: async ({ where }) => Promise.resolve(existing[where.slug] ?? null),
      create: async ({ data }) => {
        created.push(data);
        return Promise.resolve({ id: `id-${String(data.slug)}` });
      },
      update: async ({ where, data }) => {
        updated.push({ id: where.id, data });
        return Promise.resolve({});
      },
    },
    planPriceVersion: {
      findUnique: async () => Promise.resolve(null),
      create: async () => Promise.resolve({}),
    },
    planFeatureRule: {
      upsert: async (args) => {
        rules.push(args);
        return Promise.resolve({});
      },
    },
    planModelAccess: { count: async () => Promise.resolve(0) },
    userPlanAssignment: { updateMany: async () => Promise.resolve({ count: 0 }) },
  };
  return { db, created, updated, rules };
};

describe('plugin calls plan gate', () => {
  describe('plan-catalog.json (fresh installs)', () => {
    it.each(Object.entries(EXPECTED_DAILY))('gives %s its daily allowance', (slug, daily) => {
      const plan = catalog.find((entry) => entry.slug === slug);
      expect(plan?.plugins.maxCallsPerDay).toBe(daily);
    });

    it('keeps the PLUGIN_CALLS rule and the column in agreement on every plan', () => {
      for (const plan of catalog) {
        const rule = plan.features.PLUGIN_CALLS;
        const daily = plan.plugins.maxCallsPerDay;
        expect(rule?.window).toBe('DAY');
        expect(rule?.limit ?? null).toBe(daily);
        expect(rule?.accessMode).toBe(daily === null ? 'ENABLED' : 'LIMITED');
      }
    });

    it('never lowers the allowance as the price rises, and is unlimited only at the top', () => {
      let previous = 0;
      const priced = [...catalogData.plans].sort((a, b) => a.monthlyMinor - b.monthlyMinor);
      for (const plan of priced) {
        const daily = EXPECTED_DAILY[plan.slug] ?? Number.POSITIVE_INFINITY;
        expect(daily).toBeGreaterThanOrEqual(previous);
        previous = daily;
      }
    });
  });

  describe('seeder run() against a database', () => {
    it('a fresh database creates every plan with the catalog allowance and a rule for it', async () => {
      const { run } = await import('../../../../prisma/seeders/plan-catalog.seeder.cjs');
      const { db, created, rules } = makeDb({});

      await run(db);

      for (const data of created) {
        expect(data.maxPluginCallsPerDay).toBe(EXPECTED_DAILY[String(data.slug)]);
      }
      const pluginRules = (rules as RuleUpsert[]).filter(
        (args) => args.create.feature === 'PLUGIN_CALLS',
      );
      expect(pluginRules).toHaveLength(7);
      const free = pluginRules.find((args) => args.create.planId === 'id-free');
      expect(free?.create).toMatchObject({ accessMode: 'LIMITED', limit: 20, window: 'DAY' });
    });

    it('never overwrites an existing rule on re-seed (update is empty)', async () => {
      const { run } = await import('../../../../prisma/seeders/plan-catalog.seeder.cjs');
      const { db, rules } = makeDb({});

      await run(db);

      for (const args of rules as RuleUpsert[]) {
        expect(args.update).toEqual({});
      }
    });

    it('leaves the column of an administrator-edited plan to the migration', async () => {
      const { run } = await import('../../../../prisma/seeders/plan-catalog.seeder.cjs');
      const { db, updated } = makeDb({
        pro: {
          id: 'pro-id',
          slug: 'pro',
          dailyTokenQuota: 777_000,
          allowJudgeMode: true,
          allowResearchMode: true,
          modelAccessMode: 'ALLOW_ALL',
          weeklyTokenQuota: 1,
          maxPluginCallsPerDay: 7,
        },
      });

      await run(db);

      const pro = updated.find((entry) => entry.id === 'pro-id');
      expect(pro?.data).not.toHaveProperty('maxPluginCallsPerDay');
    });
  });

  describe('migration 20261013120000_add_plugin_calls_feature', () => {
    it('adds the enum value alone, guarded', () => {
      expect(ENUM_MIGRATION_SQL).toContain(
        `ALTER TYPE "PlanFeatureKey" ADD VALUE IF NOT EXISTS 'PLUGIN_CALLS';`,
      );
      expect(ENUM_MIGRATION_SQL).not.toMatch(/INSERT|UPDATE/);
    });
  });

  describe('migration 20261013120100_plugin_calls_plan_limits (upgraded databases)', () => {
    const sql = LIMITS_MIGRATION_SQL;

    it('adds the nullable column defaulting to the Free value, guarded', () => {
      expect(sql).toContain(
        'ADD COLUMN IF NOT EXISTS "max_plugin_calls_per_day" INTEGER DEFAULT 20',
      );
      expect(sql).not.toMatch(/ADD COLUMN "/);
    });

    it('moves each tier only while the column still holds the default', () => {
      const updates = sql.split('\n').filter((line) => line.startsWith('UPDATE'));
      expect(updates).toHaveLength(5);
      for (const line of updates) {
        expect(line).toContain('AND "max_plugin_calls_per_day" = 20');
      }
      expect(sql).toContain(`SET "max_plugin_calls_per_day" = 100 WHERE "slug" = 'starter'`);
      expect(sql).toContain(`SET "max_plugin_calls_per_day" = 300 WHERE "slug" = 'plus'`);
      expect(sql).toContain(`SET "max_plugin_calls_per_day" = 1000 WHERE "slug" = 'pro'`);
      expect(sql).toContain(
        `SET "max_plugin_calls_per_day" = 5000 WHERE "slug" IN ('team', 'scale')`,
      );
      expect(sql).toContain(`SET "max_plugin_calls_per_day" = NULL WHERE "slug" = 'unlimited'`);
    });

    it('never touches Free, which keeps the column default of 20', () => {
      expect(sql).not.toMatch(/SET "max_plugin_calls_per_day" = [0-9NULL]+ WHERE "slug" = 'free'/);
    });

    it('gives every plan, custom ones included, a rule derived from the column', () => {
      expect(sql).toContain(`'PLUGIN_CALLS'::"PlanFeatureKey"`);
      expect(sql).toMatch(/FROM "plans" p\s*\nON CONFLICT \("plan_id", "feature"\) DO NOTHING/);
      expect(sql).not.toMatch(/WHERE p\."slug"/);
      expect(sql).toContain(`WHEN p."max_plugin_calls_per_day" IS NULL THEN 'ENABLED'`);
      expect(sql).toContain(`WHEN p."max_plugin_calls_per_day" = 0 THEN 'DISABLED'`);
    });

    it('never rewrites an existing rule, so a re-run cannot re-enable or overwrite one', () => {
      expect(sql).not.toMatch(/UPDATE\s+"plan_feature_rules"/);
      expect(sql).not.toContain('DO UPDATE');
    });
  });

  describe('schema.prisma and the system seed', () => {
    it('declares the enum value and the nullable column with the Free default', () => {
      expect(SCHEMA_PRISMA).toMatch(/enum PlanFeatureKey \{[^}]*\bPLUGIN_CALLS\b[^}]*\}/);
      expect(SCHEMA_PRISMA).toMatch(
        /maxPluginCallsPerDay\s+Int\?\s+@default\(20\)\s+@map\("max_plugin_calls_per_day"\)/,
      );
    });

    it('seeds the Free system plan at 20 and writes the column for every definition', () => {
      expect(SEED_CJS).toContain('maxPluginCallsPerDay: 20,');
      expect(SEED_CJS).toContain('maxPluginCallsPerDay: 1000,');
      expect(SEED_CJS).toContain('maxPluginCallsPerDay: 5000,');
      expect(SEED_CJS).toContain('maxPluginCallsPerDay: def.maxPluginCallsPerDay,');
    });
  });
});
