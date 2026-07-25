#!/usr/bin/env node
// One-shot release migration across every service that owns a database.
//
// Application containers already migrate on start, guarded by Prisma's
// _prisma_migrations ledger and an advisory lock, so this is not the only safe
// path — it is the DEPLOYMENT path. Running migrations once, before any replica
// starts, means a rolling deploy never has two versions of the schema live at
// the same moment, and a failed migration aborts the release instead of
// half-starting the fleet.
//
// Every step is idempotent: re-running after a partial failure re-applies only
// what is still pending.

import { execFileSync } from 'node:child_process';
import { existsSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const APPS_DIR = join(process.cwd(), 'apps');

// A service owns a database when it ships a Prisma schema. Deriving the list
// rather than hardcoding it means a new service cannot be forgotten here.
function servicesWithSchema() {
  return readdirSync(APPS_DIR, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .filter((name) => existsSync(join(APPS_DIR, name, 'prisma', 'schema.prisma')))
    .sort();
}

function run(service, args) {
  const cwd = join(APPS_DIR, service);
  execFileSync('npx', ['prisma', ...args], {
    cwd,
    stdio: 'inherit',
    shell: process.platform === 'win32',
  });
}

function main() {
  const services = servicesWithSchema();
  if (services.length === 0) {
    console.error('migrate:all — no service with a prisma/schema.prisma was found');
    process.exit(1);
  }

  console.warn(`migrate:all — applying migrations for ${services.length} service(s)`);
  const failed = [];

  for (const service of services) {
    try {
      console.warn(`\n▶ ${service}`);
      run(service, ['migrate', 'deploy']);
    } catch {
      // Collect rather than exit immediately: knowing that three services failed
      // is more useful during a release than discovering them one deploy at a
      // time.
      failed.push(service);
      console.error(`✖ ${service}: migrate deploy failed`);
    }
  }

  if (failed.length > 0) {
    console.error(`\nmigrate:all FAILED for: ${failed.join(', ')}`);
    console.error('Abort the release. Application replicas must not start against a behind schema.');
    process.exit(1);
  }
  console.warn('\nmigrate:all OK — every service schema is current');
}

main();
