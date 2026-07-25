#!/usr/bin/env node
// One-shot versioned data seeding across every service that ships a seed.
//
// Seeders are keyed (name, version) in a seed_executions table with a checksum.
// A completed seeder never runs again, so this is safe to invoke on every
// release — and safe to re-invoke after a partial failure.
//
// The guarantee that matters: an administrator's edits to production data are
// never overwritten. A seeder that has already completed is skipped entirely,
// and a seeder whose definition changed without a version bump warns loudly
// rather than silently rewriting rows.

import { execFileSync } from 'node:child_process';
import { existsSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const APPS_DIR = join(process.cwd(), 'apps');

function servicesWithSeed() {
  return readdirSync(APPS_DIR, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .filter(
      (name) =>
        existsSync(join(APPS_DIR, name, 'prisma', 'seed.js')) ||
        existsSync(join(APPS_DIR, name, 'prisma', 'seed.ts')),
    )
    .sort();
}

function main() {
  const services = servicesWithSeed();
  console.warn(`seed:versioned — running seeders for ${services.length} service(s)`);
  const failed = [];

  for (const service of services) {
    try {
      console.warn(`\n▶ ${service}`);
      execFileSync('npx', ['prisma', 'db', 'seed'], {
        cwd: join(APPS_DIR, service),
        stdio: 'inherit',
        shell: process.platform === 'win32',
      });
    } catch {
      failed.push(service);
      console.error(`✖ ${service}: seed failed`);
    }
  }

  if (failed.length > 0) {
    console.error(`\nseed:versioned FAILED for: ${failed.join(', ')}`);
    // A failed seeder leaves its row FAILED, not absent, so the next run retries
    // that same version rather than treating it as never attempted.
    console.error('Re-run after fixing; completed seeders will not re-execute.');
    process.exit(1);
  }
  console.warn('\nseed:versioned OK');
}

main();
