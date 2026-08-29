// The five purchasable PAYG top-up packages and their first price versions.
//
// Money is integer MINOR units ($5.00 => 500) and credit is integer micro-USD
// ($3.00 => 3000000). No float touches either number: the ratio is applied as
// BigInt arithmetic, so 60% of $5 is exactly $3.00 and not 2999999.9999999995.
//
// WHY THE RATIO IS NOT 1:1. A dollar of top-up does not buy a dollar of
// provider inference. The gateway takes its cut before the money arrives, and
// the platform still pays the provider list price, so selling credit at par
// books negative gross margin on every single purchase. 0.60 is the seeded
// starting point, NOT a constant: it lives in an immutable CreditPackageVersion
// row so an operator can reprice without a deploy, and every historical
// purchase keeps the ratio it was actually sold at.
//
// A price version is IMMUTABLE. This seeder therefore does findUnique-then-
// create on `activeKey` — exactly the idiom plan-catalog.seeder.js uses for
// PlanPriceVersion — and NEVER upsert. An upsert would rewrite the price a
// completed purchase was quoted, which is the one thing a versioned price table
// exists to prevent.

const CREDIT_RATIO_NUMERATOR = 60n;
const CREDIT_RATIO_DENOMINATOR = 100n;
// $1.00 == 100 minor units == 1,000,000 micro-USD, so one minor unit is 10,000.
const MICRO_USD_PER_MINOR_UNIT = 10000n;

const PACKAGES = [
  { slug: 'credit-5', priceMinor: 500, displayOrder: 0 },
  { slug: 'credit-10', priceMinor: 1000, displayOrder: 1 },
  { slug: 'credit-25', priceMinor: 2500, displayOrder: 2 },
  { slug: 'credit-50', priceMinor: 5000, displayOrder: 3 },
  { slug: 'credit-100', priceMinor: 10000, displayOrder: 4 },
];

function creditForPrice(priceMinor) {
  return (
    (BigInt(priceMinor) * MICRO_USD_PER_MINOR_UNIT * CREDIT_RATIO_NUMERATOR) /
    CREDIT_RATIO_DENOMINATOR
  );
}

// `active_key` carries the package id while a version is the active price and
// NULL once retired, emulating a partial unique index. findUnique-then-create
// keeps this seeder from ever writing a SECOND active version, and keeps it
// from touching a version an operator has since published by hand.
async function ensureActiveVersion(prisma, pkg, priceMinor) {
  const existing = await prisma.creditPackageVersion.findUnique({
    where: { activeKey: pkg.id },
  });
  if (existing) {
    return { created: false };
  }
  await prisma.creditPackageVersion.create({
    data: {
      packageId: pkg.id,
      priceMinor,
      currency: 'USD',
      creditMicroUsd: creditForPrice(priceMinor),
      version: 1,
      isActive: true,
      activeKey: pkg.id,
    },
  });
  return { created: true };
}

async function run(prisma) {
  const report = { createdPackages: [], createdVersions: [], preserved: [] };

  for (const definition of PACKAGES) {
    const existing = await prisma.creditPackage.findUnique({ where: { slug: definition.slug } });
    let pkg = existing;
    if (!pkg) {
      pkg = await prisma.creditPackage.create({
        data: {
          slug: definition.slug,
          displayOrder: definition.displayOrder,
          isActive: true,
        },
      });
      report.createdPackages.push(definition.slug);
    }

    const version = await ensureActiveVersion(prisma, pkg, definition.priceMinor);
    if (version.created) {
      report.createdVersions.push(definition.slug);
      console.warn(
        `[seed] credit-packages: ${definition.slug} priceMinor=${definition.priceMinor} ` +
          `creditMicroUsd=${creditForPrice(definition.priceMinor).toString()}`,
      );
    } else {
      report.preserved.push(definition.slug);
      console.warn(`[seed] credit-packages: ${definition.slug} already priced — left untouched`);
    }
  }

  console.warn(
    `[seed] credit-packages: packages=${report.createdPackages.length} ` +
      `versions=${report.createdVersions.length} preserved=${report.preserved.length}`,
  );
  return report;
}

module.exports = {
  name: 'credit-packages',
  // v1. Repricing is an OPERATOR action through /admin/credit, not a seeder
  // edit: bumping this version would not retire the active row it collides
  // with, and the findUnique guard would simply skip it.
  version: 1,
  payload: PACKAGES.map((definition) => ({
    slug: definition.slug,
    priceMinor: definition.priceMinor,
    creditMicroUsd: creditForPrice(definition.priceMinor).toString(),
  })),
  run,
  PACKAGES,
  creditForPrice,
};
