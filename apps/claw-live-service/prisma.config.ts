import { defineConfig } from 'prisma/config';

export default defineConfig({
  schema: './prisma/schema.prisma',
  datasource: { url: process.env['LIVE_DATABASE_URL'] ?? '' },
  migrations: { seed: 'node prisma/seeders/live-policy.seeder.cjs' },
});
