// Prisma 7 moved the datasource URL out of schema.prisma. This file feeds
// prisma migrate / prisma db push with the connection string at CLI time.
// Runtime PrismaClient gets the URL via the driver adapter in PrismaService.
import { defineConfig } from 'prisma/config';

export default defineConfig({
  schema: './prisma/schema.prisma',
  datasource: {
    url: process.env['ROUTING_DATABASE_URL'] ?? '',
  },
  migrations: {
    // REQUIRED in Prisma 7 — the old `"prisma": { "seed": ... }` field in
    // package.json is silently ignored ("No seed command configured"), and
    // `tools/release/seed-versioned.mjs` runs `npx prisma db seed` here.
    // Without this the release lane skipped routing-service and the production
    // model-cost table stayed empty while the procedure reported success.
    //
    // Plain `node`, not ts-node: the production image ships `dist/`, not `src/`.
    seed: 'node prisma/seed.js',
  },
});
