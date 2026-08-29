// Reprices every top-up package to 100% of the amount paid.
//
// The original catalog seeded 0.60 — $5 bought $3 of credit — on the reasoning
// that the platform must take a margin somewhere. That was double-charging: the
// margin already lives in the PLAN, where only `paygCreditPercentBps` of the
// subscription price converts to credit and the rest buys everything else the
// plan includes. A top-up buys nothing but provider spend, so it sells at face
// value.
//
// WHY A NEW SEEDER RATHER THAN AN EDIT TO THE FIRST ONE. A `CreditPackageVersion`
// is immutable, and `credit-packages.seeder.js` guards with
// findUnique-then-create on `activeKey`: on an install where it has already run,
// bumping its version would find the active row, skip it, and change nothing.
// The correct way to change an immutable price is to RETIRE the active version
// and publish the next one — which is also what an operator repricing by hand
// through /admin/credit does, so a purchase made yesterday keeps the ratio it
// was actually quoted.
//
// Idempotent: a package already at face value is left alone, so this is a no-op
// on a fresh install where `credit-packages` seeded 100% directly.

const MICRO_USD_PER_MINOR_UNIT = 10000n;

/** Face value: one minor unit of payment buys 10,000 micro-USD of credit. */
function faceValueCredit(priceMinor) {
  return BigInt(priceMinor) * MICRO_USD_PER_MINOR_UNIT;
}

async function repriceOne(prisma, pkg) {
  const active = await prisma.creditPackageVersion.findUnique({
    where: { activeKey: pkg.id },
  });
  if (active === null) {
    // No active price at all. Publishing one here would invent a package the
    // catalog seeder never created; that seeder owns creation.
    return { slug: pkg.slug, outcome: 'NO_ACTIVE_VERSION' };
  }
  const target = faceValueCredit(active.priceMinor);
  if (active.creditMicroUsd === target) {
    return { slug: pkg.slug, outcome: 'ALREADY_FACE_VALUE' };
  }

  // Retire and publish in ONE transaction. `activeKey` is a partial unique
  // index, so releasing it and claiming it must not be separable — a crash
  // between the two would leave the package unbuyable.
  await prisma.$transaction(async (tx) => {
    await tx.creditPackageVersion.update({
      where: { id: active.id },
      data: { isActive: false, activeKey: null, retiredAt: new Date() },
    });
    await tx.creditPackageVersion.create({
      data: {
        packageId: pkg.id,
        priceMinor: active.priceMinor,
        currency: active.currency,
        creditMicroUsd: target,
        version: active.version + 1,
        isActive: true,
        activeKey: pkg.id,
      },
    });
  });
  return { slug: pkg.slug, outcome: 'REPRICED', version: active.version + 1 };
}

async function run(prisma) {
  const packages = await prisma.creditPackage.findMany();
  const results = [];
  for (const pkg of packages) {
    results.push(await repriceOne(prisma, pkg));
  }
  const repriced = results.filter((r) => r.outcome === 'REPRICED');
  // eslint-disable-next-line no-console
  console.log(
    repriced.length > 0
      ? `[seed] credit-package-repricing: ${repriced.map((r) => r.slug).join(', ')} now sell at face value`
      : '[seed] credit-package-repricing: every package already sells at face value',
  );
  return { repriced: repriced.length, inspected: results.length };
}

module.exports = {
  name: 'credit-package-repricing',
  version: 1,
  // No payload to checksum: the seeder reads the live rows and computes the
  // target from each one's own price. A hardcoded list here would go stale the
  // moment an operator added a package.
  payload: { policy: 'face-value', ratioBps: 10000 },
  run,
};
