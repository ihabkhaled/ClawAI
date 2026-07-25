// Run-once machinery for versioned data seeders.
//
// Migrations and seeds still run at container start — but a completed seeder is
// never executed twice, so restarting a replica (or scaling to several) cannot
// re-seed over administrator-edited production rows.
//
// Two independent guards, because either one alone is insufficient:
//   1. A Postgres ADVISORY LOCK serialises concurrent starters. Without it, two
//      replicas booting together both read "not yet seeded" and both insert.
//   2. A SeedExecution row records name+version+checksum. The lock only orders
//      the racers; this is what makes the SECOND run a no-op.
//
// A changed seed requires a NEW version. Editing a completed seeder and hoping
// it re-runs is exactly the failure mode this file exists to prevent — the
// checksum turns that mistake into a loud warning instead of silent drift.

const crypto = require('node:crypto');

// Stable 32-bit advisory-lock key derived from the seeder name, so unrelated
// seeders never block each other.
function advisoryLockKey(name) {
  const digest = crypto.createHash('sha256').update(name).digest();
  // Signed 32-bit range — pg_advisory_lock(bigint) accepts it and it stays
  // stable across processes and releases.
  return digest.readInt32BE(0);
}

function checksumOf(payload) {
  return crypto.createHash('sha256').update(JSON.stringify(payload)).digest('hex');
}

async function withAdvisoryLock(prisma, name, fn) {
  const key = advisoryLockKey(name);
  await prisma.$executeRawUnsafe('SELECT pg_advisory_lock($1)', key);
  try {
    return await fn();
  } finally {
    // Released in `finally` so a thrown seeder cannot wedge every future boot.
    await prisma.$executeRawUnsafe('SELECT pg_advisory_unlock($1)', key);
  }
}

// seeder: { name, version, payload, run(prisma, payload) }
async function runVersionedSeeder(prisma, seeder) {
  const checksum = checksumOf(seeder.payload);
  return withAdvisoryLock(prisma, seeder.name, async () => {
    const existing = await prisma.seedExecution.findUnique({
      where: { name_version: { name: seeder.name, version: seeder.version } },
    });
    if (existing && existing.status === 'COMPLETED') {
      if (existing.checksum !== checksum) {
        console.warn(
          `[seed] ${seeder.name} v${seeder.version} already applied with a DIFFERENT checksum. ` +
            'The seed definition changed after it ran — bump the version to apply the change.',
        );
      }
      return { applied: false, reason: 'already-completed' };
    }

    const record = existing
      ? await prisma.seedExecution.update({
          where: { id: existing.id },
          data: { status: 'RUNNING', checksum, startedAt: new Date(), lastError: null },
        })
      : await prisma.seedExecution.create({
          data: { name: seeder.name, version: seeder.version, checksum, status: 'RUNNING' },
        });

    try {
      const result = await seeder.run(prisma, seeder.payload);
      await prisma.seedExecution.update({
        where: { id: record.id },
        data: { status: 'COMPLETED', completedAt: new Date() },
      });
      return { applied: true, result };
    } catch (error) {
      // FAILED (not deleted) so the next boot retries this same version rather
      // than treating it as never-attempted.
      await prisma.seedExecution.update({
        where: { id: record.id },
        data: {
          status: 'FAILED',
          lastError: String(error && error.message ? error.message : error),
        },
      });
      throw error;
    }
  });
}

module.exports = { runVersionedSeeder, checksumOf, advisoryLockKey };
