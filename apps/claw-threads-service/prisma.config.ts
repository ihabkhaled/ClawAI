import { defineConfig } from 'prisma/config';

export default defineConfig({
  schema: './prisma/schema.prisma',
  datasource: { url: process.env['THREADS_DATABASE_URL'] ?? '' },
});
