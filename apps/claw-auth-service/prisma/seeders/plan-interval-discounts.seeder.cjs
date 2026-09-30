// Re-mints every plan's QUARTERLY / SEMIANNUAL / YEARLY PlanPriceVersion so it
// equals what the plan's MONTHLY price and its term discounts say it is:
//
//   amount = round(monthly x months x (10000 - discountBps) / 10000)
//
// with the defaults 10% quarterly, 15% semiannual, 20% yearly (the columns
// `plans.quarterly_discount_bps`, `semiannual_discount_bps`, `yearly_discount_bps`
// default to those figures, so this seeder reads the DB value, not a constant).
//
// WHY A NEW SEEDER, NOT AN EDIT TO plan-catalog / plan-quarterly-semiannual.
// Both are completed, checksum-pinned versions, and their figures (10% for
// 3 and 6 months, a 10-months-for-12 yearly) are history. Prices are append-only
// (rule 28 item 1): this seeder RETIRES the old version and inserts a new one,
// exactly as PlanBillingRepository.publishPriceSet does at runtime. An existing
// subscription keeps pointing at the version it bought; only a NEW checkout
// sees the new price.
//
// Reads plans live, uses each plan's own ACTIVE MONTHLY price (an operator may
// have re-priced since the JSON catalog shipped), and skips a plan with no
// positive monthly price (Free). Idempotent: an interval already at the right
// amount and currency is left alone, so a second run mints nothing.

const DERIVED = [
  ['QUARTERLY', 3, 'quarterlyDiscountBps'],
  ['SEMIANNUAL', 6, 'semiannualDiscountBps'],
  ['YEARLY', 12, 'yearlyDiscountBps'],
];

// Mirrors computeIntervalPriceMinor in
// src/modules/plans/utilities/plan-interval-price.utility.ts (a spec asserts
// the two agree). Integer arithmetic; rounded once.
function computeIntervalPriceMinor(monthlyMinor, months, discountBps) {
  return Math.round((monthlyMinor * months * (10000 - discountBps)) / 10000);
}

async function repricePlan(prisma, plan) {
  const monthly = await prisma.planPriceVersion.findFirst({
    where: { planId: plan.id, billingInterval: 'MONTHLY', isActive: true },
  });
  if (!monthly || monthly.amountMinor <= 0) {
    return { slug: plan.slug, minted: [] };
  }

  const minted = [];
  let yearlyMinor = null;
  await prisma.$transaction(async (tx) => {
    for (const [billingInterval, months, discountField] of DERIVED) {
      const amountMinor = computeIntervalPriceMinor(
        monthly.amountMinor,
        months,
        plan[discountField],
      );
      if (billingInterval === 'YEARLY') {
        yearlyMinor = amountMinor;
      }
      const activeKey = `${plan.id}:${billingInterval}`;
      const previous = await tx.planPriceVersion.findUnique({ where: { activeKey } });
      if (
        previous &&
        previous.amountMinor === amountMinor &&
        previous.currency === monthly.currency
      ) {
        continue;
      }
      if (previous) {
        await tx.planPriceVersion.update({
          where: { id: previous.id },
          data: { isActive: false, activeKey: null, retiredAt: new Date() },
        });
      }
      await tx.planPriceVersion.create({
        data: {
          planId: plan.id,
          billingInterval,
          currency: monthly.currency,
          amountMinor,
          version: (previous ? previous.version : 0) + 1,
          isActive: true,
          activeKey,
        },
      });
      minted.push(billingInterval);
    }
    // Keep the legacy display columns in step with the versions.
    await tx.plan.update({
      where: { id: plan.id },
      data: { priceMonthly: monthly.amountMinor / 100, priceYearly: yearlyMinor / 100 },
    });
  });
  return { slug: plan.slug, minted };
}

async function run(prisma) {
  const plans = await prisma.plan.findMany();
  const results = [];
  for (const plan of plans) {
    results.push(await repricePlan(prisma, plan));
  }
  const touched = results.filter((result) => result.minted.length > 0);
  console.warn(
    touched.length > 0
      ? `[seed] plan-interval-discounts: re-priced ${touched
          .map((result) => `${result.slug}(${result.minted.join(',')})`)
          .join(', ')}`
      : '[seed] plan-interval-discounts: every plan already matches its term discounts',
  );
  return { results };
}

module.exports = {
  name: 'plan-interval-discounts',
  version: 1,
  // A stable description of the policy, not a data table: the checksum stays
  // constant across runs. The figures live in the plans table.
  payload: {
    policy: 'longer terms = monthly x months x (10000 - plan discount bps) / 10000',
    defaults: { quarterlyBps: 1000, semiannualBps: 1500, yearlyBps: 2000 },
  },
  run,
  computeIntervalPriceMinor,
};
