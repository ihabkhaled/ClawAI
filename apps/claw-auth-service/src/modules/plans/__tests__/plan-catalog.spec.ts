// Guards the money and allowance matrix that backs the seven public plans.
//
// The catalog lives in JSON because the versioned seeder runs under bare `node`
// in the production image, where the TypeScript sources are not shipped — so
// the seeder and this spec read the SAME file rather than two copies that can
// drift. A typo in a price or a quota is caught here rather than after it has
// been charged to a customer.
//
// The run-once behaviour, the admin-preservation path and the database-level
// single-active-price constraint are proven against a real PostgreSQL instance;
// see docs/04-backend/service-guide-payment.md for that evidence.

import catalogData from '../../../../prisma/seeders/plan-catalog.json';

type CatalogEntry = {
  slug: string;
  monthlyMinor: number;
  yearlyMinor: number | null;
  dailyTokens: number;
  weeklyTokens: number;
  monthlyTokens: number | null;
  costCeilingMicroUsd: string;
  chatsPerDay: number | null;
  messagesPerDay: number | null;
  allowedCostClasses: string[];
  features: Record<string, { accessMode: string; limit: number | null; window: string }>;
};

const catalog = catalogData.plans as unknown as CatalogEntry[];
const bySlug = (slug: string): CatalogEntry => {
  const found = catalog.find((plan) => plan.slug === slug);
  if (!found) {
    throw new Error(`missing plan ${slug}`);
  }
  return found;
};

describe('plan catalog', () => {
  it('publishes exactly the seven approved plans in display order', () => {
    expect(catalog.map((plan) => plan.slug)).toEqual([
      'free',
      'starter',
      'plus',
      'pro',
      'team',
      'scale',
      'unlimited',
    ]);
  });

  it('prices every plan in integer minor units', () => {
    for (const plan of catalog) {
      expect(Number.isInteger(plan.monthlyMinor)).toBe(true);
      expect(plan.yearlyMinor === null || Number.isInteger(plan.yearlyMinor)).toBe(true);
    }
  });

  it.each([
    ['free', 0, null],
    ['starter', 500, 5_000],
    ['plus', 1_000, 10_000],
    ['pro', 2_000, 20_000],
    ['team', 5_000, 50_000],
    ['scale', 10_000, 100_000],
    ['unlimited', 20_000, 200_000],
  ])('prices %s at %d/%s minor units', (slug, monthly, yearly) => {
    const plan = bySlug(slug as string);
    expect(plan.monthlyMinor).toBe(monthly);
    expect(plan.yearlyMinor).toBe(yearly);
  });

  it('gives roughly two months free on every yearly price', () => {
    for (const plan of catalog) {
      if (plan.yearlyMinor === null || plan.monthlyMinor === 0) {
        continue;
      }
      expect(plan.yearlyMinor).toBe(plan.monthlyMinor * 10);
    }
  });

  it('keeps daily < weekly < monthly for every metered plan', () => {
    for (const plan of catalog) {
      expect(plan.weeklyTokens).toBeGreaterThan(plan.dailyTokens);
      if (plan.monthlyTokens !== null) {
        expect(plan.monthlyTokens).toBeGreaterThan(plan.weeklyTokens);
      }
    }
  });

  it('raises the allowance monotonically as the price rises', () => {
    const paid = catalog.filter((plan) => plan.monthlyMinor > 0);
    for (let i = 1; i < paid.length; i += 1) {
      expect(paid[i]?.dailyTokens ?? 0).toBeGreaterThan(paid[i - 1]?.dailyTokens ?? 0);
    }
  });

  it('sets a provider-cost ceiling on every plan, including Unlimited', () => {
    // "Unlimited" is unlimited in chats and messages, never in money.
    for (const plan of catalog) {
      expect(BigInt(plan.costCeilingMicroUsd)).toBeGreaterThan(0n);
    }
    expect(BigInt(bySlug('unlimited').costCeilingMicroUsd)).toBe(50_000_000n);
  });

  it('carries the cost ceiling as a string so it widens to BigInt, never a float', () => {
    for (const plan of catalog) {
      expect(typeof plan.costCeilingMicroUsd).toBe('string');
    }
  });

  it('uses null (not 0) where Unlimited genuinely means unlimited', () => {
    // 0 means disabled elsewhere in this system; conflating the two would lock
    // the most expensive plan out of chatting entirely.
    const unlimited = bySlug('unlimited');
    expect(unlimited.monthlyTokens).toBeNull();
    expect(unlimited.chatsPerDay).toBeNull();
    expect(unlimited.messagesPerDay).toBeNull();
  });

  it('gives Free exactly one lifetime run of each advanced feature', () => {
    const free = bySlug('free');
    for (const feature of ['COMPARE_MODE', 'JUDGE_MODE', 'RESEARCH_MODE', 'CRITIC_REVIEW']) {
      expect(free.features[feature]).toEqual({
        accessMode: 'LIMITED',
        limit: 1,
        window: 'LIFETIME',
      });
    }
  });

  it('disables workspaces on Free', () => {
    expect(bySlug('free').features['WORKSPACES']?.accessMode).toBe('DISABLED');
  });

  it('never grants ULTRA models below Team', () => {
    for (const slug of ['free', 'starter', 'plus', 'pro']) {
      expect(bySlug(slug).allowedCostClasses).not.toContain('ULTRA');
    }
    for (const slug of ['team', 'scale', 'unlimited']) {
      expect(bySlug(slug).allowedCostClasses).toContain('ULTRA');
    }
  });

  it('widens model access monotonically with price', () => {
    for (let i = 1; i < catalog.length; i += 1) {
      const previous = catalog[i - 1]?.allowedCostClasses ?? [];
      const current = catalog[i]?.allowedCostClasses ?? [];
      expect(current.length).toBeGreaterThanOrEqual(previous.length);
      for (const cls of previous) {
        expect(current).toContain(cls);
      }
    }
  });

  it('declares a LIMITED rule with a positive limit and ENABLED with none', () => {
    for (const plan of catalog) {
      for (const rule of Object.values(plan.features)) {
        if (rule.accessMode === 'LIMITED') {
          expect(rule.limit).toBeGreaterThan(0);
        } else {
          expect(rule.limit).toBeNull();
        }
      }
    }
  });
});

describe('catalog integrity', () => {
  it('declares every feature key on every plan, so no plan falls through to a default', () => {
    const expected = [
      'COMPARE_MODE',
      'JUDGE_MODE',
      'RESEARCH_MODE',
      'CRITIC_REVIEW',
      'WORKSPACES',
      'MEMORY',
      'CONTEXT_PACKS',
    ];
    for (const plan of catalog) {
      expect(Object.keys(plan.features).sort()).toEqual([...expected].sort());
    }
  });

  it('has exactly one default plan and it is Free', () => {
    const defaults = catalogData.plans.filter((plan) => plan.isDefault);
    expect(defaults).toHaveLength(1);
    expect(defaults[0]?.slug).toBe('free');
  });

  it('gives every plan a unique slug and display order', () => {
    const slugs = catalog.map((plan) => plan.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
    const orders = catalogData.plans.map((plan) => plan.displayOrder);
    expect(new Set(orders).size).toBe(orders.length);
  });

  it('uses an explicit model-access mode everywhere — never the legacy fallback', () => {
    // LEGACY_UNRESTRICTED exists only to keep pre-existing installs working
    // through the migration window; a seeded plan must never rely on it.
    for (const plan of catalogData.plans) {
      expect(plan.modelAccessMode).not.toBe('LEGACY_UNRESTRICTED');
      expect(plan.allowedCostClasses.length).toBeGreaterThan(0);
    }
  });
});
