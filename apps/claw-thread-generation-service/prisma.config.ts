import { defineConfig } from 'prisma/config';

export default defineConfig({
  schema: './prisma/schema.prisma',
  datasource: {
    url: process.env['THREAD_GENERATION_DATABASE_URL'] ?? '',
  },
});
