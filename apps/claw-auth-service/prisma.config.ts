// Prisma 7 moved the datasource URL out of schema.prisma. This file feeds
// `prisma migrate` / `prisma db push` with the connection string at CLI time.
// Runtime PrismaClient gets the URL via the driver adapter in PrismaService.
//
// `migrations.seed` is also required in Prisma 7 — the old
// `"prisma": { "seed": ... }` field in package.json is silently ignored
// in v7 (`⚠️ No seed command configured`), and the admin user never gets
// inserted on first start. Login then returns 401 INVALID_CREDENTIALS
// because there's literally no user in the auth DB.
import { defineConfig } from 'prisma/config';

export default defineConfig({
  schema: './prisma/schema.prisma',
  datasource: {
    url: process.env['AUTH_DATABASE_URL'] ?? '',
  },
  migrations: {
    // Plain `node` (not ts-node) so it runs in production images that don't
    // ship the src/ tree. The script reads PrismaClient from dist/, which
    // exists in both dev (built by entrypoint) and prod (built by
    // Dockerfile). See prisma/seed.js for the rationale.
    seed: 'node prisma/seed.js',
  },
});
