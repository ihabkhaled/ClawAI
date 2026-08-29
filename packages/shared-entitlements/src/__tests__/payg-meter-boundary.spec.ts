import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

// Architecture test for rule 37 rule 9: PAYG classification lives in
// auth-service, never here.
//
// This package ships as six copies inside six `node_modules` directories. A
// policy compiled into it can therefore only change by rebuilding six
// containers — which would make the per-connector `isPayAsYouGo` admin toggle
// unenforceable (ADR-082). The meter is allowed to know that a request should
// be SENT to auth; it is not allowed to know the answer.
//
// The one deliberate exception is `PAYG_EXEMPT_PROVIDERS`, and only for the
// fail-open half of the outage rule: when auth is unreachable, a local model
// must still run. Knowing which providers are FREE cannot cause a paid request
// to be waved through — the metered set is what must never be decided here.
const SOURCE_ROOT = join(__dirname, '..');

/** Every `.ts` in the package except the tests themselves. */
function sourceFiles(dir: string): string[] {
  const found: string[] = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name !== '__tests__') {
        found.push(...sourceFiles(full));
      }
      continue;
    }
    if (entry.name.endsWith('.ts')) {
      found.push(full);
    }
  }
  return found;
}

describe('shared-entitlements must not decide PAYG policy', () => {
  const files = sourceFiles(SOURCE_ROOT).map((path) => ({
    path: path.slice(SOURCE_ROOT.length + 1).replaceAll('\\', '/'),
    text: readFileSync(path, 'utf8'),
  }));

  it('has sources to inspect', () => {
    expect(files.length).toBeGreaterThan(5);
  });

  it('never imports the metered-provider list', () => {
    const offenders = files
      .filter((f) => f.text.includes('PAYG_DEFAULT_PROVIDERS'))
      .map((f) => f.path);
    expect(offenders).toEqual([]);
  });

  it('never imports rate or pricing types', () => {
    const banned = [
      'ModelCostRates',
      'ModelCostSnapshot',
      'calculateCostMicroUsd',
      'clampOutputTokensToBalance',
      'estimateWeightedTokens',
      'hasUsablePricing',
    ];
    const offenders = files.flatMap((f) =>
      banned.filter((symbol) => f.text.includes(symbol)).map((symbol) => `${f.path} → ${symbol}`),
    );
    expect(offenders).toEqual([]);
  });

  it('carries no per-million rate, threshold or allowance number', () => {
    const banned = [/PerMillion/, /MICRO_USD_PER_USD/, /WARNING_THRESHOLD/, /monthlyProviderCost/];
    const offenders = files.flatMap((f) =>
      banned
        .filter((pattern) => pattern.test(f.text))
        .map((pattern) => `${f.path} → ${String(pattern)}`),
    );
    expect(offenders).toEqual([]);
  });

  it('reads the exempt list only, never a metered one', () => {
    const meter = files.find((f) => f.path === 'payg-meter.ts');
    expect(meter).toBeDefined();
    expect(meter?.text).toContain('PAYG_EXEMPT_PROVIDERS');
  });
});
