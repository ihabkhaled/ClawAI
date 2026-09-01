/* eslint-disable no-console */
// The release-lane entry point for routing-service's versioned seeds.
//
// WHY THIS FILE EXISTS
// --------------------
// `tools/release/seed-versioned.mjs` picks a workspace by the presence of
// `prisma/seed.cjs|js|ts` and runs `npx prisma db seed` in it. routing-service had
// `seed-router-models.ts`, `seed-taxonomy.ts` and `seed-workflows.ts` — none of
// them named `seed.js`/`seed.cjs`, and `prisma.config.ts` declared no `migrations.seed` —
// so the documented release lane (`npm run release:prepare` -> `seed:versioned`)
// SKIPPED routing-service entirely.
//
// The consequence was a production `model_cost_versions` table that stayed
// EMPTY while the operator followed the release procedure exactly. Prices
// reached the database only through `ModelCostSeedService.onModuleInit`, which
// needs routing-service to boot on an image that already contains the seeder.
// An install that had not yet taken that image had no prices at all, and
// nothing in the release output said so.
//
// Plain JS reading from `dist/`, never `src/` — the production image does not
// ship the TypeScript tree, and `ts-node` is not installed there. Same reason
// `apps/claw-auth-service/prisma/seed.cjs` is plain JS; that file says so too.
//
// It reuses `ModelCostSeedService` rather than re-listing the rates. A second
// copy of a price table is a second thing to forget: this writes through the
// same advisory lock, the same `SeedExecution` ledger row and the same checksum
// as the boot path, so running both is idempotent and running either suffices.

const path = require('path');

const distRoot = path.resolve(__dirname, '..', 'dist');
const { PrismaClient } = require(path.join(distRoot, 'generated', 'prisma'));
const { ModelCostSeedRepository } = require(
  path.join(distRoot, 'modules', 'router-models', 'repositories', 'model-cost-seed.repository'),
);
const { ModelCostSeedService } = require(
  path.join(distRoot, 'modules', 'router-models', 'services', 'model-cost-seed.service'),
);
const { PrismaPg } = require('@prisma/adapter-pg');

async function main() {
  const connectionString = process.env.ROUTING_DATABASE_URL;
  if (!connectionString) {
    // Failing loudly beats seeding nothing quietly: an empty price table is
    // invisible until a user is refused or over-charged by a fallback rate.
    throw new Error('ROUTING_DATABASE_URL is not set — cannot seed model costs');
  }

  const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString }) });
  try {
    // The repository is a Nest provider whose only dependency is the client;
    // constructing it directly keeps this script free of a DI container it
    // does not need, while still running the exact same code as boot.
    const service = new ModelCostSeedService(new ModelCostSeedRepository(prisma));
    const result = await service.seed();
    console.warn(
      `[seed] model-cost: ${result.outcome} inserted=${result.inserted} skipped=${result.skipped}`,
    );
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error('[seed] routing-service seed failed:', error);
  // Non-zero exit is what makes `seed:versioned` report this service as failed
  // instead of printing a green summary over an empty price table.
  process.exitCode = 1;
});
