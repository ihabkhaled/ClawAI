import { defineConfig } from 'prisma/config';

export default defineConfig({
  schema: './prisma/schema.prisma',
  datasource: { url: process.env['PLUGIN_DATABASE_URL'] ?? '' },
});
