// Moves EXISTING installs onto the PAYG credit allowance curve.
//
// Why this is a separate seeder rather than a plan-catalog version bump:
// trace plan-catalog.seeder.js `run()` on an install where v2 already ran.
// `existing` is truthy for all seven plans, so the create branch never fires,
// and `matchesLegacyFingerprint` returns false for every plan (v2 already moved
// them off the pre-billing values), so every plan falls to the else branch —
// which writes only `modelAccessMode` and a null `weeklyTokenQuota`. A v3 bump
// would apply the new allowances to ZERO rows and report success.
//
// Three columns move together and MUST agree:
//   dailyTokenQuota, weeklyTokenQuota, monthlyTokenQuota, and
//   monthlyProviderCostCeilingMicroUsd (identical to the monthly quota).
// 1 weighted token == 1 micro-USD, so the monthly quota and the cost ceiling
// are one number wearing two names. If they drift, the smaller binds and a user
// is refused at half the credit their billing page shows.
//
// Every update is targeted at the OLD value. An administrator who has already
// tuned a plan keeps their number — the seeder reports it as skipped rather
// than "fixing" a deliberate operator decision.
//
// Free's previous numbers were INCOHERENT: 300,000/day against a 20,000 weekly
// ceiling, so the real enforced allowance was $0.02 a week while the pricing
// page advertised fifteen times that per day. The replacement widens as the
// window lengthens ($0.05 / $0.15 / $0.30), which is the invariant
// `findQuotaWindowConflicts` enforces on every subsequent edit.
//
// Every tier's MONTHLY allowance goes up or stays equal, so no existing user
// loses spending power in this migration.

const ALLOWANCES = [
  // slug, previous [daily, weekly, monthly|null, ceiling], next [daily, weekly, monthly]
  { slug: 'free', from: [300000, 20000, null, '300000'], to: [50000, 150000, 300000] },
  { slug: 'starter', from: [50000, 250000, 750000, '750000'], to: [150000, 600000, 1500000] },
  { slug: 'plus', from: [100000, 600000, 1750000, '1750000'], to: [300000, 1200000, 3000000] },
  { slug: 'pro', from: [250000, 1500000, 4000000, '4000000'], to: [500000, 2000000, 5000000] },
  { slug: 'team', from: [750000, 4000000, 11000000, '11000000'], to: [1250000, 5000000, 12500000] },
  {
    slug: 'scale',
    from: [1500000, 9000000, 24000000, '24000000'],
    to: [2500000, 10000000, 25000000],
  },
  {
    slug: 'unlimited',
    from: [5000000, 30000000, null, '50000000'],
    to: [5000000, 20000000, 50000000],
  },
];

// Each column is moved by its OWN updateMany, keyed on the old value. A single
// combined WHERE would skip a plan where an operator had edited just one of the
// four, leaving the other three stranded at values that no longer agree —
// which is precisely the incoherent state this seeder exists to end.
async function applyColumn(prisma, slug, column, fromValue, toValue) {
  const result = await prisma.plan.updateMany({
    where: { slug, [column]: fromValue },
    data: { [column]: toValue },
  });
  return result.count;
}

async function applyPlan(prisma, entry) {
  const [fromDaily, fromWeekly, fromMonthly, fromCeiling] = entry.from;
  const [toDaily, toWeekly, toMonthly] = entry.to;

  const counts = {
    dailyTokenQuota: await applyColumn(prisma, entry.slug, 'dailyTokenQuota', fromDaily, toDaily),
    weeklyTokenQuota: await applyColumn(
      prisma,
      entry.slug,
      'weeklyTokenQuota',
      fromWeekly,
      toWeekly,
    ),
    monthlyTokenQuota: await applyColumn(
      prisma,
      entry.slug,
      'monthlyTokenQuota',
      fromMonthly,
      toMonthly,
    ),
    monthlyProviderCostCeilingMicroUsd: await applyColumn(
      prisma,
      entry.slug,
      'monthlyProviderCostCeilingMicroUsd',
      BigInt(fromCeiling),
      BigInt(toMonthly),
    ),
  };
  const updated = Object.values(counts).reduce((total, count) => total + count, 0);
  console.warn(
    `[seed] plan-payg-allowance: ${entry.slug} daily=${counts.dailyTokenQuota} ` +
      `weekly=${counts.weeklyTokenQuota} monthly=${counts.monthlyTokenQuota} ` +
      `ceiling=${counts.monthlyProviderCostCeilingMicroUsd}`,
  );
  return { slug: entry.slug, counts, updated };
}

async function run(prisma) {
  const results = [];
  for (const entry of ALLOWANCES) {
    results.push(await applyPlan(prisma, entry));
  }
  const changed = results.filter((result) => result.updated > 0).map((result) => result.slug);
  const untouched = results.filter((result) => result.updated === 0).map((result) => result.slug);
  console.warn(
    `[seed] plan-payg-allowance: changed=${changed.length} untouched=${untouched.length}`,
  );
  if (untouched.length > 0) {
    console.warn(
      `[seed] plan-payg-allowance: left administrator-edited or already-current values for ${untouched.join(', ')}`,
    );
  }
  return { results, changed, untouched };
}

module.exports = {
  name: 'plan-payg-allowance',
  // v1. A future allowance change needs a NEW version AND new `from` values —
  // editing this file in place would not re-run it, and would leave the
  // checksum warning as the only trace of the attempt.
  version: 1,
  payload: ALLOWANCES,
  run,
  ALLOWANCES,
};
