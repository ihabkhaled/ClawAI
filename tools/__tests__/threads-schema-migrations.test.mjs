import { readdirSync, readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { test } from 'node:test';
import assert from 'node:assert/strict';

// The generation migration created "spend_cap_micro_credits" while the schema read
// "spend_cap_micro_usd", so a database built only from migrations failed every job.
// Every mapped column and table in a Threads schema must appear in its migrations.
const APPS = join(import.meta.dirname, '..', '..', 'apps');

for (const app of ['claw-threads-service', 'claw-thread-generation-service']) {
  test(`${app}: every mapped column and table exists in its migrations`, () => {
    const prisma = join(APPS, app, 'prisma');
    const schema = readFileSync(join(prisma, 'schema.prisma'), 'utf8');
    const dir = join(prisma, 'migrations');
    const sql = readdirSync(dir)
      .filter((name) => existsSync(join(dir, name, 'migration.sql')))
      .map((name) => readFileSync(join(dir, name, 'migration.sql'), 'utf8'))
      .join('\n');
    const names = [...schema.matchAll(/@(?:@)?map\("([a-z0-9_]+)"\)/gu)].map((match) => match[1]);
    const missing = [...new Set(names)].filter((name) => !sql.includes(`"${name}"`));
    assert.deepEqual(missing, [], `mapped names absent from migrations: ${missing.join(', ')}`);
  });
}
