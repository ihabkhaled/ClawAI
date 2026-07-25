// Prisma 7 moved the datasource URL out of schema.prisma. This file feeds
// prisma migrate / prisma db push with the connection string at CLI time.
// Runtime PrismaClient gets the URL via the driver adapter in PrismaService.
import { defineConfig } from 'prisma/config';

// Throwaway database Prisma replays migrations into when generating a diff
// (`prisma migrate diff --from-migrations`) or running `migrate dev`. Only ever
// set by a developer or CI.
//
// The key is OMITTED entirely when unset: Prisma rejects an empty string with
// P1013, which would make `migrate deploy` fail inside the container entrypoint
// — where no shadow database exists or is needed.
const shadowDatabaseUrl = process.env['PAYMENT_SHADOW_DATABASE_URL'];
const hasShadowDatabase = shadowDatabaseUrl !== undefined && shadowDatabaseUrl !== '';

export default defineConfig({
  schema: './prisma/schema.prisma',
  datasource: {
    url: process.env['PAYMENT_DATABASE_URL'] ?? '',
    ...(hasShadowDatabase ? { shadowDatabaseUrl } : {}),
  },
});
