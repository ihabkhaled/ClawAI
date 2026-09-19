import { readdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { test } from 'node:test';
import assert from 'node:assert/strict';

// Rule 52: a service with a Prisma schema ships its migrations.
// file-generation-service had none until 2026-09-19: dev tables came from
// `db push`, while production's database held only _prisma_migrations, so
// every AI file request in production failed at its first insert.
const APPS = join(import.meta.dirname, '..', '..', 'apps');

test('every service with a Prisma schema has at least one migration', () => {
  const missing = [];
  for (const app of readdirSync(APPS)) {
    const prisma = join(APPS, app, 'prisma');
    if (!existsSync(join(prisma, 'schema.prisma'))) continue;
    const dir = join(prisma, 'migrations');
    const migrations = existsSync(dir)
      ? readdirSync(dir).filter((name) => existsSync(join(dir, name, 'migration.sql')))
      : [];
    if (migrations.length === 0) missing.push(app);
  }
  assert.deepEqual(missing, [], `services with a schema but no migration: ${missing.join(', ')}`);
});
