// Sets each plan's per-call limits (ADR-197). The numbers come from
// docs/03-architecture/model-price-ledger-2026-10-30.md, part 2: one call may spend at most
// 10% of the plan's monthly provider-cost ceiling, input is capped at 200,000 tokens so no
// call crosses a provider's long-context price tier, and output follows the plan size.
//
// Only a NULL column is written, so a value an administrator has set (including 0, which
// means "refuse every call") survives, and a re-run changes nothing.

const LIMITS = [
  { slug: 'free', maxInput: 16_000, maxOutput: 2_000, maxCostMicroUsd: 30_000 },
  { slug: 'starter', maxInput: 32_000, maxOutput: 4_000, maxCostMicroUsd: 150_000 },
  { slug: 'plus', maxInput: 64_000, maxOutput: 8_000, maxCostMicroUsd: 300_000 },
  { slug: 'pro', maxInput: 128_000, maxOutput: 16_000, maxCostMicroUsd: 500_000 },
  { slug: 'team', maxInput: 200_000, maxOutput: 24_000, maxCostMicroUsd: 1_250_000 },
  { slug: 'scale', maxInput: 200_000, maxOutput: 32_000, maxCostMicroUsd: 2_500_000 },
  { slug: 'unlimited', maxInput: 200_000, maxOutput: 64_000, maxCostMicroUsd: 5_000_000 },
];

async function fillNull(prisma, slug, column, value) {
  const result = await prisma.plan.updateMany({
    where: { slug, [column]: null },
    data: { [column]: value },
  });
  return result.count;
}

async function run(prisma, limits) {
  const applied = [];
  for (const { slug, maxInput, maxOutput, maxCostMicroUsd } of limits) {
    const written =
      (await fillNull(prisma, slug, 'maxInputTokensPerCall', maxInput)) +
      (await fillNull(prisma, slug, 'maxOutputTokensPerCall', maxOutput)) +
      (await fillNull(prisma, slug, 'maxCostPerCallMicroUsd', BigInt(maxCostMicroUsd)));
    if (written > 0) {
      applied.push(`${slug}(${String(written)})`);
    }
  }
  // eslint-disable-next-line no-console
  console.log(
    applied.length > 0
      ? `[seed] plan-call-limits: filled ${applied.join(', ')}`
      : '[seed] plan-call-limits: every plan already carries its limits',
  );
  return { applied: applied.length };
}

module.exports = {
  name: 'plan-call-limits',
  version: 1,
  payload: LIMITS,
  run,
};
