// Prisma 7 moved the datasource URL out of schema.prisma. This file feeds
// prisma migrate / prisma db push with the connection string at CLI time.
// Runtime PrismaClient gets the URL via the driver adapter in PrismaService.
import { defineConfig } from 'prisma/config';

export default defineConfig({
  schema: './prisma/schema.prisma',
  datasource: {
    url: process.env['WORKSPACE_DATABASE_URL'] ?? '',
  },
});