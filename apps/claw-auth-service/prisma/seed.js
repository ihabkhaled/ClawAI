// Plain-JS seed so it runs in both dev (after `npm run build`) and prod
// without needing ts-node or the src/ tree. Imports the compiled Prisma
// client from dist/, where it lands in both modes after the build step.
//
// Dev path:  docker-entrypoint.dev.sh runs `nest build` + copies the
//            generated client into dist/ BEFORE calling `prisma db seed`.
// Prod path: Dockerfile builder stage does the same; runner copies dist/.
// Either way, /app/dist/generated/prisma is present at seed time.

const { PrismaPg } = require('@prisma/adapter-pg');
const argon2 = require('argon2');
const path = require('path');

const distPrismaPath = path.resolve(__dirname, '..', 'dist', 'generated', 'prisma');
const { PrismaClient } = require(distPrismaPath);

const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'admin@claw.local';
const ADMIN_USERNAME = process.env.ADMIN_USERNAME || 'admin';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'ClawAdmin123!';

const ARGON2_MEMORY_COST = 65536;
const ARGON2_TIME_COST = 3;
const ARGON2_PARALLELISM = 4;

const connectionString = process.env.AUTH_DATABASE_URL;
if (!connectionString) {
  throw new Error('AUTH_DATABASE_URL must be set when running prisma db seed');
}

const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString }) });

async function seed() {
  const existingCount = await prisma.user.count();

  if (existingCount > 0) {
    console.warn('Users already exist — skipping seed.');
    return;
  }

  const passwordHash = await argon2.hash(ADMIN_PASSWORD, {
    type: argon2.argon2id,
    memoryCost: ARGON2_MEMORY_COST,
    timeCost: ARGON2_TIME_COST,
    parallelism: ARGON2_PARALLELISM,
  });

  const admin = await prisma.user.create({
    data: {
      email: ADMIN_EMAIL,
      username: ADMIN_USERNAME,
      passwordHash,
      role: 'ADMIN',
      status: 'ACTIVE',
      mustChangePassword: true,
    },
  });

  console.warn(`Seeded default admin user: ${admin.email} (id: ${admin.id})`);
  console.warn('IMPORTANT: Change the admin password on first login.');
}

seed()
  .catch((error) => {
    console.error('Seed failed:', error);
    process.exit(1);
  })
  .finally(() => {
    void prisma.$disconnect();
  });
