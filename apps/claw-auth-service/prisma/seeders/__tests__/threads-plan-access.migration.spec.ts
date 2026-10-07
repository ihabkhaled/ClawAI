import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const planCatalog = require('../plan-catalog.seeder.cjs');

// Owner decision 2026-10-07: Threads is open to Free, Starter and Plus. The data
// migration must say what the catalog says and must never overwrite an edited rule.

type Rule = { accessMode: string; limit: number | null; window: string };
type Definition = { slug: string; features?: Record<string, Rule> };

const MIGRATION = readFileSync(
  join(
    __dirname,
    '..',
    '..',
    'migrations',
    '20261007120000_threads_allowed_on_every_plan',
    'migration.sql',
  ),
  'utf8',
);
const catalog: Definition[] = planCatalog.PLAN_CATALOG;

describe('threads plan access migration', () => {
  it('only opens rules that are still DISABLED', () => {
    expect(MIGRATION).toContain(`"access_mode" = 'DISABLED'`);
  });

  it('touches only free, starter and plus and only the three Threads features', () => {
    expect(MIGRATION).toContain(`IN ('free', 'starter', 'plus')`);
    expect(MIGRATION).toContain(`IN ('RESEARCH_MODE', 'JUDGE_MODE', 'CRITIC_REVIEW')`);
  });

  it.each([
    ['free', 1, 'LIFETIME'],
    ['starter', 2, 'MONTH'],
    ['plus', 10, 'MONTH'],
  ])('the catalog gives %s %i reviews per %s', (slug, limit, window) => {
    const plan = catalog.find((entry) => entry.slug === slug);
    const research = plan?.features?.['RESEARCH_MODE'];
    expect(research).toMatchObject({ accessMode: 'LIMITED', limit, window });
    expect(MIGRATION).toContain(slug);
  });
});
