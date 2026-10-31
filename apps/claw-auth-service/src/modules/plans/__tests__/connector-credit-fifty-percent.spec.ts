// ADR-209: the monthly connector credit is 50% of the plan price on every paid plan.
// The catalog feeds fresh installs; the migration moves existing rows. Both are checked here
// because a catalog that says one thing and a migration that says another is how two installs of
// one release end up granting different credit.
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { join } from 'node:path';

import catalogData from '../../../../prisma/seeders/plan-catalog.json';
import { creditFromPayment } from '../../credit/utilities/credit-conversion.utility';

type CatalogEntry = { slug: string; monthlyMinor: number; paygCreditPercentBps: number };

const catalog = catalogData.plans as CatalogEntry[];
const PAID_SLUGS = ['starter', 'plus', 'pro', 'team', 'scale', 'unlimited'];
const FIFTY_PERCENT_BPS = 5000;
const MIGRATION_PATH = join(
  __dirname,
  '..',
  '..',
  '..',
  '..',
  'prisma',
  'migrations',
  '20261031150000_connector_credit_fifty_percent',
  'migration.sql',
);
// The path is a fixed in-repo constant, never user input.
// eslint-disable-next-line security/detect-non-literal-fs-filename
const SQL = readFileSync(MIGRATION_PATH, 'utf8');

// The credit in micro-USD each plan grants a month at its catalog price (1 cent = 10,000).
const EXPECTED_CREDIT_MICRO_USD: Record<string, bigint> = {
  free: 0n,
  starter: 2_500_000n,
  plus: 5_000_000n,
  pro: 10_000_000n,
  team: 25_000_000n,
  scale: 50_000_000n,
  unlimited: 100_000_000n,
};

describe('monthly connector credit is 50% of the plan price (ADR-209)', () => {
  it.each(PAID_SLUGS)('catalog: %s converts 5000 bps (50%) of its price', (slug) => {
    const plan = catalog.find((entry) => entry.slug === slug);
    expect(plan?.paygCreditPercentBps).toBe(FIFTY_PERCENT_BPS);
  });

  it('catalog: grants each plan half of its monthly price in credit', () => {
    for (const plan of catalog) {
      expect(creditFromPayment(plan.monthlyMinor, plan.paygCreditPercentBps)).toBe(
        EXPECTED_CREDIT_MICRO_USD[plan.slug],
      );
    }
  });

  it('catalog: Free is unchanged and still grants $0 because its price is $0', () => {
    const free = catalog.find((entry) => entry.slug === 'free');
    expect(free?.monthlyMinor).toBe(0);
    expect(creditFromPayment(free?.monthlyMinor ?? 0, free?.paygCreditPercentBps ?? 0)).toBe(0n);
  });

  it('the per-plan seeder for existing installs carries the same 50% for paid plans', () => {
    const { payload } = createRequire(__filename)(
      '../../../../prisma/seeders/plan-payg-percent.seeder.cjs',
    ) as { payload: unknown };
    const byslug = new Map(
      (payload as { slug: string; bps: number }[]).map((p) => [p.slug, p.bps]),
    );
    for (const slug of PAID_SLUGS) {
      expect(byslug.get(slug)).toBe(FIFTY_PERCENT_BPS);
    }
  });

  describe('migration 20261031150000_connector_credit_fifty_percent', () => {
    const statements = SQL.split(';')
      .map((chunk) =>
        chunk
          .split('\n')
          .filter((line) => !line.trim().startsWith('--'))
          .join('\n')
          .trim(),
      )
      .filter((chunk) => chunk.length > 0);

    it('only updates the plans table, additively: no DDL, no DELETE', () => {
      expect(statements).toHaveLength(2);
      for (const statement of statements) {
        expect(statement).toMatch(/^UPDATE "plans"/);
      }
      expect(SQL).not.toMatch(/\b(DROP|DELETE|TRUNCATE|ALTER)\b/i);
    });

    it('moves only rows still at the old shipped value, so an edited rate survives', () => {
      expect(statements[0]).toContain(`SET "payg_credit_percent_bps" = ${FIFTY_PERCENT_BPS}`);
      expect(statements[0]).toContain(`"slug" IN ('starter', 'plus')`);
      expect(statements[0]).toContain('AND "payg_credit_percent_bps" = 3000');
      expect(statements[1]).toContain(`SET "payg_credit_percent_bps" = ${FIFTY_PERCENT_BPS}`);
      expect(statements[1]).toContain(`"slug" IN ('pro', 'team', 'scale', 'unlimited')`);
      expect(statements[1]).toContain('AND "payg_credit_percent_bps" = 2500');
    });

    it('names exactly the paid slugs and never Free', () => {
      const named = [...SQL.matchAll(/IN \(([^)]*)\)/g)]
        .flatMap((match) => (match[1] ?? '').split(','))
        .map((part) => part.trim().replaceAll("'", ''))
        .sort();
      expect(named).toEqual([...PAID_SLUGS].sort());
      expect(SQL).not.toMatch(/'free'/);
    });

    it('is idempotent: the guard values can never equal the value it writes', () => {
      // Run a second time, every migrated row holds 5000, which neither guard (3000, 2500) matches.
      const guards = [...SQL.matchAll(/AND "payg_credit_percent_bps" = (\d+);/g)].map((match) =>
        Number(match[1]),
      );
      expect(guards.length).toBe(2);
      expect(guards).not.toContain(FIFTY_PERCENT_BPS);
    });
  });
});
