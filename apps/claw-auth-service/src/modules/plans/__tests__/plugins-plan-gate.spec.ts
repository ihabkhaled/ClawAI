// Plugins and MCP plan gate (docs/implementation/plugins-and-mcp-design.md section 5).
//
// Owner decision (2026-10-13): the module is ON for every plan including Free,
// unlike every media gate, which is opt-in. The two caps are nullable: null is
// unlimited, 0 is disabled. Free installs 5 and registers 0 own MCP servers.
//
// A fresh database takes the catalog through the seeder's create branch; an
// upgraded database takes migration 20261013100000_add_plugins_plan_gate. Both
// are checked here, because a catalog that says one thing and a migration that
// says another is how a plan ends up with the module off or unlimited by accident.
import MIGRATION_SQL from '../../../../prisma/migrations/20261013100000_add_plugins_plan_gate/migration.sql?raw';
import SCHEMA_PRISMA from '../../../../prisma/schema.prisma?raw';
import SEED_CJS from '../../../../prisma/seed.cjs?raw';
import catalogData from '../../../../prisma/seeders/plan-catalog.json';
import type { PlanSeederDb } from '../../../../prisma/seeders/plan-catalog.seeder.cjs';

type PluginsBlock = {
  enabled: boolean;
  maxInstalled: number | null;
  maxUserMcpServers: number | null;
};
type PluginsCatalogEntry = { slug: string; plugins: PluginsBlock };

const catalog = catalogData.plans as PluginsCatalogEntry[];

const EXPECTED_CAPS: Record<string, { installs: number | null; servers: number | null }> = {
  free: { installs: 5, servers: 0 },
  starter: { installs: 10, servers: 3 },
  plus: { installs: 25, servers: 5 },
  pro: { installs: 50, servers: 10 },
  team: { installs: 100, servers: 25 },
  scale: { installs: 100, servers: 25 },
  unlimited: { installs: null, servers: null },
};

describe('plugins plan gate', () => {
  describe('plan-catalog.json (fresh installs)', () => {
    it('turns the module on for every plan, Free included', () => {
      expect(catalog.length).toBe(Object.keys(EXPECTED_CAPS).length);
      for (const plan of catalog) {
        expect(plan.plugins.enabled).toBe(true);
      }
    });

    it.each(Object.entries(EXPECTED_CAPS))(
      'gives %s its install and own-server caps',
      (slug, caps) => {
        const plan = catalog.find((entry) => entry.slug === slug);
        expect(plan?.plugins.maxInstalled).toBe(caps.installs);
        expect(plan?.plugins.maxUserMcpServers).toBe(caps.servers);
      },
    );

    it('lets Free install from the curated catalog but register no server of its own', () => {
      const free = catalog.find((entry) => entry.slug === 'free');
      expect(free?.plugins).toEqual({ enabled: true, maxInstalled: 5, maxUserMcpServers: 0 });
    });

    it('is unlimited (null) only on the top tier, never by omission elsewhere', () => {
      for (const plan of catalog) {
        const unlimited = plan.slug === 'unlimited';
        expect(plan.plugins.maxInstalled === null).toBe(unlimited);
        expect(plan.plugins.maxUserMcpServers === null).toBe(unlimited);
      }
    });

    it('never lowers a cap when the price goes up', () => {
      const priced = [...catalog].sort(
        (a, b) =>
          (catalogData.plans.find((p) => p.slug === a.slug)?.monthlyMinor ?? 0) -
          (catalogData.plans.find((p) => p.slug === b.slug)?.monthlyMinor ?? 0),
      );
      let installs = 0;
      let servers = 0;
      for (const plan of priced) {
        const nextInstalls = plan.plugins.maxInstalled ?? Number.POSITIVE_INFINITY;
        const nextServers = plan.plugins.maxUserMcpServers ?? Number.POSITIVE_INFINITY;
        expect(nextInstalls).toBeGreaterThanOrEqual(installs);
        expect(nextServers).toBeGreaterThanOrEqual(servers);
        installs = nextInstalls;
        servers = nextServers;
      }
    });
  });

  describe('pluginGateProjections', () => {
    it('projects the block onto the Plan columns', async () => {
      const { pluginGateProjections } =
        await import('../../../../prisma/seeders/plan-catalog.seeder.cjs');
      expect(
        pluginGateProjections({ enabled: true, maxInstalled: 50, maxUserMcpServers: 10 }),
      ).toEqual({ allowPlugins: true, maxInstalledPlugins: 50, maxUserMcpServers: 10 });
      expect(
        pluginGateProjections({ enabled: true, maxInstalled: null, maxUserMcpServers: null }),
      ).toEqual({ allowPlugins: true, maxInstalledPlugins: null, maxUserMcpServers: null });
    });

    it('defaults a missing block to ON with the Free caps, never to unlimited', async () => {
      const { pluginGateProjections } =
        await import('../../../../prisma/seeders/plan-catalog.seeder.cjs');
      expect(pluginGateProjections(undefined)).toEqual({
        allowPlugins: true,
        maxInstalledPlugins: 5,
        maxUserMcpServers: 0,
      });
      expect(pluginGateProjections({})).toEqual({
        allowPlugins: true,
        maxInstalledPlugins: 5,
        maxUserMcpServers: 0,
      });
    });

    it('switches the module off only on an explicit enabled:false', async () => {
      const { pluginGateProjections } =
        await import('../../../../prisma/seeders/plan-catalog.seeder.cjs');
      expect(pluginGateProjections({ enabled: false }).allowPlugins).toBe(false);
    });

    it('keeps 0 (disabled) apart from null (unlimited)', async () => {
      const { pluginGateProjections } =
        await import('../../../../prisma/seeders/plan-catalog.seeder.cjs');
      const zero = pluginGateProjections({ maxInstalled: 0, maxUserMcpServers: 0 });
      expect(zero.maxInstalledPlugins).toBe(0);
      expect(zero.maxUserMcpServers).toBe(0);
    });
  });

  describe('seeder run() against a database', () => {
    const makeDb = (existing: Record<string, Record<string, unknown>>) => {
      const created: Array<Record<string, unknown>> = [];
      const updated: Array<{ id: string; data: Record<string, unknown> }> = [];
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
        planFeatureRule: { upsert: async () => Promise.resolve({}) },
        userPlanAssignment: { updateMany: async () => Promise.resolve({ count: 0 }) },
      };
      return { db, created, updated };
    };

    it('a fresh database creates every plan with the module on and the catalog caps', async () => {
      const { run } = await import('../../../../prisma/seeders/plan-catalog.seeder.cjs');
      const { db, created } = makeDb({});

      await run(db);

      expect(created.length).toBe(7);
      for (const data of created) {
        const caps = EXPECTED_CAPS[String(data.slug)];
        expect(data.allowPlugins).toBe(true);
        expect(data.maxInstalledPlugins).toBe(caps?.installs);
        expect(data.maxUserMcpServers).toBe(caps?.servers);
      }
    });

    it('brings an untouched legacy free row forward with the module on', async () => {
      const { run } = await import('../../../../prisma/seeders/plan-catalog.seeder.cjs');
      const { db, updated } = makeDb({
        free: {
          id: 'free-id',
          slug: 'free',
          dailyTokenQuota: 50_000,
          allowJudgeMode: false,
          allowResearchMode: false,
          isTrial: true,
          trialDurationDays: 30,
        },
      });

      await run(db);

      const free = updated.find((entry) => entry.id === 'free-id');
      expect(free?.data.allowPlugins).toBe(true);
      expect(free?.data.maxInstalledPlugins).toBe(5);
      expect(free?.data.maxUserMcpServers).toBe(0);
    });

    it('leaves the plugin columns of an administrator-edited plan to the migration', async () => {
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
          allowPlugins: true,
          maxInstalledPlugins: 7,
        },
      });

      await run(db);

      const pro = updated.find((entry) => entry.id === 'pro-id');
      expect(pro?.data).not.toHaveProperty('allowPlugins');
      expect(pro?.data).not.toHaveProperty('maxInstalledPlugins');
      expect(pro?.data).not.toHaveProperty('maxUserMcpServers');
    });
  });

  describe('migration 20261013100000_add_plugins_plan_gate (upgraded databases)', () => {
    const sql = MIGRATION_SQL;

    it('adds the gate defaulting to true and the caps defaulting to the Free values', () => {
      expect(sql).toContain(
        'ADD COLUMN IF NOT EXISTS "allow_plugins" BOOLEAN NOT NULL DEFAULT true',
      );
      expect(sql).toContain('ADD COLUMN IF NOT EXISTS "max_installed_plugins" INTEGER DEFAULT 5');
      expect(sql).toContain('ADD COLUMN IF NOT EXISTS "max_user_mcp_servers" INTEGER DEFAULT 0');
    });

    it('is idempotent: every column add is guarded and every cap update keys off the default', () => {
      expect(sql).not.toMatch(/ADD COLUMN "/);
      const capUpdates = sql.split('\n').filter((line) => line.includes('SET "max_'));
      expect(capUpdates.length).toBeGreaterThan(0);
      for (const line of capUpdates) {
        expect(line).toMatch(/AND "max_(installed_plugins" = 5|user_mcp_servers" = 0)/);
      }
    });

    it('never rewrites allow_plugins, so a re-run cannot re-enable a plan an admin disabled', () => {
      expect(sql).not.toMatch(/UPDATE\s+"plans"\s+SET\s+"allow_plugins"/);
    });

    it('moves each tier to the same caps the catalog carries', () => {
      expect(sql).toContain(`SET "max_installed_plugins" = 10 WHERE "slug" = 'starter'`);
      expect(sql).toContain(`SET "max_installed_plugins" = 25 WHERE "slug" = 'plus'`);
      expect(sql).toContain(`SET "max_installed_plugins" = 50 WHERE "slug" = 'pro'`);
      expect(sql).toContain(`SET "max_installed_plugins" = 100 WHERE "slug" IN ('team', 'scale')`);
      expect(sql).toContain(`SET "max_installed_plugins" = NULL WHERE "slug" = 'unlimited'`);
      expect(sql).toContain(`SET "max_user_mcp_servers" = 3 WHERE "slug" = 'starter'`);
      expect(sql).toContain(`SET "max_user_mcp_servers" = 5 WHERE "slug" = 'plus'`);
      expect(sql).toContain(`SET "max_user_mcp_servers" = 10 WHERE "slug" = 'pro'`);
      expect(sql).toContain(`SET "max_user_mcp_servers" = 25 WHERE "slug" IN ('team', 'scale')`);
      expect(sql).toContain(`SET "max_user_mcp_servers" = NULL WHERE "slug" = 'unlimited'`);
    });

    it('never touches Free: it keeps the column defaults of 5 installs and 0 own servers', () => {
      expect(sql).not.toMatch(/SET "max_[a-z_]+" = [0-9NULL]+ WHERE "slug" = 'free'/);
      expect(sql).not.toMatch(/SET "max_[a-z_]+" = [0-9NULL]+ WHERE "slug" IN \('trial'/);
    });
  });

  describe('schema.prisma and the system seed', () => {
    it('declares the gate DEFAULT true and the caps nullable with Free defaults', () => {
      const schema = SCHEMA_PRISMA;
      expect(schema).toMatch(/allowPlugins\s+Boolean\s+@default\(true\)\s+@map\("allow_plugins"\)/);
      expect(schema).toMatch(
        /maxInstalledPlugins\s+Int\?\s+@default\(5\)\s+@map\("max_installed_plugins"\)/,
      );
      expect(schema).toMatch(
        /maxUserMcpServers\s+Int\?\s+@default\(0\)\s+@map\("max_user_mcp_servers"\)/,
      );
    });

    it('seeds the three system plans with the module on', () => {
      const seed = SEED_CJS;
      expect(seed.match(/allowPlugins: true,/g)?.length).toBe(3);
      expect(seed).toContain('allowPlugins: def.allowPlugins,');
      expect(seed).toContain('maxInstalledPlugins: def.maxInstalledPlugins,');
      expect(seed).toContain('maxUserMcpServers: def.maxUserMcpServers,');
    });
  });
});
