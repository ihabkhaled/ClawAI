// Sets each plan's PAYG credit conversion rate on installs that already exist.
//
// PAYG credit is a SHARE OF WHAT THE USER PAYS. The monthly grant is
// `activeMonthlyPrice.amountMinor * paygCreditPercentBps / 10000`, so this
// column is the whole configuration — there is no absolute credit figure to
// keep in step with the price any more.
//
// The rates below are chosen so that EVERY PAID PLAN GRANTS EXACTLY WHAT IT
// GRANTED BEFORE. The previous implementation used
// `monthlyProviderCostCeilingMicroUsd` as the grant, and those seeded ceilings
// happen to be precisely 30% (starter, plus) or 25% (pro and up) of each plan's
// monthly price. Nobody's allowance moves; only its derivation does:
//
//   starter   $5  * 30% = $1.50   (ceiling was 1_500_000 micro-USD)
//   plus      $10 * 30% = $3.00   (was  3_000_000)
//   pro       $20 * 25% = $5.00   (was  5_000_000)
//   team      $50 * 25% = $12.50  (was 12_500_000)
//   scale     $100* 25% = $25.00  (was 25_000_000)
//   unlimited $200* 25% = $50.00  (was 50_000_000)
//
// Free is the one real change, and it is a consequence of the model rather than
// a decision taken here: a $0 price converts to $0 of credit at any rate. Free
// keeps local models and its token allowance; it no longer carries $0.30 of
// paid-connector spend. `plan-catalog.json` corrects Free's description in the
// same change so the copy does not promise frontier access the plan cannot buy.
//
// Only rows still at the schema default are written, so an operator who has
// already tuned a rate keeps it.

const PERCENTS = [
  { slug: 'free', bps: 3000 },
  { slug: 'starter', bps: 3000 },
  { slug: 'plus', bps: 3000 },
  { slug: 'pro', bps: 2500 },
  { slug: 'team', bps: 2500 },
  { slug: 'scale', bps: 2500 },
  { slug: 'unlimited', bps: 2500 },
];

const SCHEMA_DEFAULT_BPS = 3000;

async function run(prisma, percents) {
  const applied = [];
  for (const { slug, bps } of percents) {
    // Keyed on the schema default so a hand-tuned rate is never overwritten.
    // A plan already at the value we want reports 0 and that is correct, not a
    // failure — the seeder is idempotent by construction.
    const result = await prisma.plan.updateMany({
      where: { slug, paygCreditPercentBps: SCHEMA_DEFAULT_BPS },
      data: { paygCreditPercentBps: bps },
    });
    if (result.count > 0) {
      applied.push(`${slug}=${String(bps)}bps`);
    }
  }
  // eslint-disable-next-line no-console
  console.log(
    applied.length > 0
      ? `[seed] plan-payg-percent: set ${applied.join(', ')}`
      : '[seed] plan-payg-percent: every plan already carries a rate',
  );
  return { applied: applied.length };
}

module.exports = {
  name: 'plan-payg-percent',
  version: 1,
  payload: PERCENTS,
  run,
};
