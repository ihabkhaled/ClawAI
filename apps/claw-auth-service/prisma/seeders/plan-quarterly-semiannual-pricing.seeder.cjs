// Backfills the QUARTERLY and SEMIANNUAL PlanPriceVersion rows onto EXISTING
// installs — every install that already completed plan-catalog v2.
//
// WHY THIS IS A SEPARATE SEEDER RATHER THAN A plan-catalog VERSION BUMP. Trace
// plan-catalog.seeder.cjs `run()` on an install where v2 already ran:
// `upsertPrices` IS called again for every plan (it runs inside the loop on
// every pass, not gated by matchesLegacyFingerprint), but its own inner guard
// — `findUnique` on `activeKey`, skip if it already exists — is a no-op guard
// for a MONTHLY/YEARLY row that already exists, and it would ALSO have created
// the QUARTERLY/SEMIANNUAL rows on that same pass if `upsertPrices` had ever
// executed. It never does, because the OUTER run-once guard in
// `seed-runner.cjs` checks `SeedExecution` for `(name, version)` BEFORE calling
// `run()` at all: v2 is already COMPLETED, so `run()` — and therefore
// `upsertPrices` — never executes a second time. The whole seeder body,
// `upsertPrices` included, is skipped wholesale. A v3 bump would fix this for
// a fresh v3 checksum, but would also re-run the legacy-fingerprint /
// administrator-edit logic in `run()`, which is unrelated risk this backfill
// does not need to take on.
//
// This seeder reads plans LIVE (`prisma.plan.findMany()`), not the static
// `plan-catalog.json` — an operator may have added a plan since the JSON
// catalog shipped, and it must get QUARTERLY/SEMIANNUAL prices too. The
// "monthly price" input to the discount formula is each plan's own currently
// ACTIVE `MONTHLY` `PlanPriceVersion` row, not the JSON value — a plan an
// operator has since re-priced must have its discount computed from the price
// customers are actually quoted today, not the original seed figure. A plan
// with no active MONTHLY price is skipped (there is nothing to derive a
// discount from) and reported as a warning, never thrown — one mispriced plan
// must not abort the backfill for every other plan.
//
// Keyed on `activeKey` existence exactly like `upsertPrices`, so running this
// twice — or running it after a fresh install where plan-catalog v2 already
// created these rows via `upsertPrices` — is a safe no-op.
//
// MUST run after `planCatalogSeeder` (which creates the plans) and before any
// deploy that expects the 4-way checkout term selector to actually be
// selectable on an EXISTING install: without this seeder, QUARTERLY and
// SEMIANNUAL have no PlanPriceVersion row on any install that seeded before
// this feature shipped, and the checkout term selector has nothing to sell.

const { computeDiscountedIntervalMinor } = require('./plan-catalog.seeder.cjs');

const QUARTERLY_MONTHS = 3;
const SEMIANNUAL_MONTHS = 6;

async function backfillPlan(prisma, plan) {
  const activeMonthly = await prisma.planPriceVersion.findFirst({
    where: { planId: plan.id, billingInterval: 'MONTHLY', isActive: true },
  });
  if (!activeMonthly) {
    console.warn(
      `[seed] plan-quarterly-semiannual-pricing: skipping ${plan.slug} — no active MONTHLY price to derive a discount from`,
    );
    return { slug: plan.slug, created: [] };
  }

  const intervals = [
    ['QUARTERLY', computeDiscountedIntervalMinor(activeMonthly.amountMinor, QUARTERLY_MONTHS)],
    ['SEMIANNUAL', computeDiscountedIntervalMinor(activeMonthly.amountMinor, SEMIANNUAL_MONTHS)],
  ];

  const created = [];
  for (const [billingInterval, amountMinor] of intervals) {
    const activeKey = `${plan.id}:${billingInterval}`;
    const existing = await prisma.planPriceVersion.findUnique({ where: { activeKey } });
    if (existing) {
      continue;
    }
    await prisma.planPriceVersion.create({
      data: {
        planId: plan.id,
        billingInterval,
        currency: activeMonthly.currency,
        amountMinor,
        version: 1,
        isActive: true,
        activeKey,
      },
    });
    created.push(billingInterval);
  }
  return { slug: plan.slug, created };
}

async function run(prisma) {
  const plans = await prisma.plan.findMany();
  const results = [];
  for (const plan of plans) {
    results.push(await backfillPlan(prisma, plan));
  }
  const touched = results.filter((result) => result.created.length > 0);
  console.warn(
    touched.length > 0
      ? `[seed] plan-quarterly-semiannual-pricing: backfilled ${touched
          .map((result) => `${result.slug}(${result.created.join(',')})`)
          .join(', ')}`
      : '[seed] plan-quarterly-semiannual-pricing: every plan already has QUARTERLY/SEMIANNUAL prices',
  );
  return { results };
}

module.exports = {
  name: 'plan-quarterly-semiannual-pricing',
  // v1. Additive-only: there is no meaningful "from" value the way the PAYG
  // allowance seeder has one, since this seeder only ever creates rows that
  // did not exist. The payload is a stable description of the policy rather
  // than a data table, so the checksum stays constant across runs.
  version: 1,
  payload: {
    discount:
      "10% off monthly for QUARTERLY/SEMIANNUAL, computed from each plan's live MONTHLY price",
  },
  run,
};
