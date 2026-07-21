#!/usr/bin/env node
/**
 * scripts/vercel/migrate.mjs — run database migrations for every ClawAI service
 * that owns a database, driven by deploy/vercel/migrations.json.
 *
 * Guarantees:
 *   - `prisma migrate dev` is never invoked. Deploy-only.
 *   - Direct (non-pooled) URLs are preferred; pooled URLs break Prisma's
 *     advisory locks and can leave a half-applied schema.
 *   - Connection strings are never printed. Only the service name and a
 *     redacted host summary.
 *   - Execution stops at the first failure — later services may depend on
 *     earlier ones having migrated.
 *
 *   node scripts/vercel/migrate.mjs --all
 *   node scripts/vercel/migrate.mjs --service auth
 *   node scripts/vercel/migrate.mjs --all --dry-run
 */

import { spawnSync } from 'node:child_process';
import { dirname, join } from 'node:path';

import {
  REPO_ROOT,
  loadMigrationsManifest,
  loadDeploymentEnv,
  parseArgs,
  isDryRun,
  log,
  runScript,
  RunSummary,
} from './lib/common.mjs';

/**
 * Describe a connection string without leaking it. Host and database name only —
 * no credentials, no query parameters (which can carry sslcert paths or tokens).
 */
function describeConnection(value) {
  if (value === undefined || value === '') {
    return '<unset>';
  }
  try {
    const url = new URL(value);
    const database = url.pathname.replace(/^\//, '');
    return `${url.protocol}//<redacted>@${url.hostname}/${database === '' ? '<default>' : database}`;
  } catch {
    return '<unparseable connection string>';
  }
}

/** Pooled connection strings are recognisable and must not be used for DDL. */
function looksPooled(value) {
  if (value === undefined) {
    return false;
  }
  return /pgbouncer=true|-pooler\.|\bpool_timeout=/i.test(value);
}

function selectMigrations(manifest, flags) {
  const wanted = flags.service;
  if (typeof wanted === 'string' && wanted.length > 0) {
    const match = manifest.migrations.find((entry) => entry.service === wanted || entry.projectName === wanted);
    if (match === undefined) {
      const excluded = manifest.excluded.find((entry) => entry.service === wanted);
      if (excluded !== undefined) {
        throw new Error(`"${wanted}" has no migration entry: ${excluded.reason}`);
      }
      throw new Error(
        `Unknown --service "${wanted}". Known: ${manifest.migrations.map((entry) => entry.service).join(', ')}`,
      );
    }
    return [match];
  }
  return [...manifest.migrations].sort((a, b) => a.order - b.order);
}

function runPrisma(entry, connectionString, dryRun) {
  const schemaPath = join(REPO_ROOT, entry.schema);
  const workspaceDir = dirname(dirname(schemaPath));
  const [command, ...args] = entry.command.split(' ');
  const fullArgs = [...args, '--schema', schemaPath];

  if (dryRun) {
    log.info(`would run: ${command} ${fullArgs.join(' ')}`);
    log.info(`  cwd    : ${workspaceDir}`);
    return { ok: true };
  }

  const result = spawnSync(command, fullArgs, {
    cwd: workspaceDir,
    stdio: 'inherit',
    shell: process.platform === 'win32',
    env: {
      ...process.env,
      // Prisma reads the datasource url from the env var named in the schema's
      // datasource block. Every ClawAI schema uses its own *_DATABASE_URL name,
      // so we set that name to the direct URL for the duration of this call.
      [entry.databaseVariable]: connectionString,
    },
  });

  if (result.error !== undefined && result.error !== null) {
    return { ok: false, message: result.error.message };
  }
  if (result.status !== 0) {
    return { ok: false, message: `exited with code ${result.status}` };
  }
  return { ok: true };
}

async function ensureExtensions(entry, connectionString, dryRun) {
  const extensions = entry.requiresExtensions ?? [];
  if (extensions.length === 0) {
    return { ok: true };
  }
  if (dryRun) {
    for (const extension of extensions) {
      log.info(`would ensure extension: ${extension}`);
    }
    return { ok: true };
  }

  // Prisma ships pg as a transitive dependency of the migrate engine in some
  // setups but not reliably, so shell out to psql when available and fall back
  // to a clear instruction rather than silently skipping a hard requirement.
  for (const extension of extensions) {
    const result = spawnSync('psql', [connectionString, '-v', 'ON_ERROR_STOP=1', '-c', `CREATE EXTENSION IF NOT EXISTS ${extension};`], {
      stdio: ['ignore', 'ignore', 'pipe'],
      shell: process.platform === 'win32',
    });
    if (result.error !== undefined && result.error !== null) {
      log.warn(
        `psql is not available, so the "${extension}" extension could not be created automatically. ` +
          `Run: CREATE EXTENSION IF NOT EXISTS ${extension};  against the ${entry.service} database before deploying.`,
      );
      continue;
    }
    if (result.status !== 0) {
      const stderr = String(result.stderr ?? '');
      return {
        ok: false,
        message: `CREATE EXTENSION ${extension} failed — ${stderr.split('\n')[0] || `exit ${result.status}`}`,
      };
    }
    log.ok(`extension "${extension}" present`);
  }
  return { ok: true };
}

async function runMongoIndexes(entry, connectionString, dryRun) {
  const indexes = entry.indexes ?? [];
  if (indexes.length === 0) {
    return { ok: true };
  }

  if (dryRun) {
    for (const index of indexes) {
      const ttl = index.options.expireAfterSeconds !== undefined ? ` TTL=${index.options.expireAfterSeconds}s` : '';
      log.info(`would ensure index ${index.options.name} on ${index.collection}${ttl}`);
    }
    return { ok: true };
  }

  let mongoose;
  try {
    mongoose = (await import('mongoose')).default;
  } catch {
    return {
      ok: false,
      message:
        'mongoose is not resolvable from the repository root. Run `npm ci` before migrating MongoDB services.',
    };
  }

  const connection = await mongoose.createConnection(connectionString).asPromise();
  try {
    for (const index of indexes) {
      const collection = connection.db.collection(index.collection);
      try {
        await collection.createIndex(index.keys, index.options);
        const ttl = index.options.expireAfterSeconds !== undefined ? ` (TTL ${index.options.expireAfterSeconds}s)` : '';
        log.ok(`index ${index.options.name} on ${index.collection}${ttl}`);
      } catch (error) {
        // An existing index with the same name but different options must be
        // surfaced, not swallowed — a stale TTL means data is retained forever.
        return { ok: false, message: `index ${index.options.name} on ${index.collection} — ${error.message}` };
      }
    }
  } finally {
    await connection.close();
  }
  return { ok: true };
}

async function main() {
  const { flags } = parseArgs();
  const dryRun = isDryRun(flags);
  const manifest = loadMigrationsManifest();
  const { values: env } = loadDeploymentEnv(flags);
  const selected = selectMigrations(manifest, flags);

  log.step(`Migrating ${selected.length} database(s)${dryRun ? ' [DRY RUN]' : ''}`);

  const summary = new RunSummary('Migration');

  for (const entry of selected) {
    const directValue = entry.directDatabaseVariable === null ? undefined : env[entry.directDatabaseVariable];
    const pooledValue = env[entry.databaseVariable];
    const connectionString = directValue ?? pooledValue;
    const usedVariable = directValue !== undefined ? entry.directDatabaseVariable : entry.databaseVariable;

    log.step(`${entry.service} (${entry.engine})`);
    log.plain(`  variable : ${usedVariable}`);
    log.plain(`  target   : ${describeConnection(connectionString)}`);

    if (connectionString === undefined || connectionString === '') {
      log.error(`no value for ${entry.directDatabaseVariable ?? entry.databaseVariable} — cannot migrate`);
      summary.add('Failed', entry.service);
      break;
    }

    if (entry.directDatabaseVariable !== null && directValue === undefined) {
      if (looksPooled(pooledValue)) {
        log.error(
          `${entry.directDatabaseVariable} is not set and ${entry.databaseVariable} looks like a pooled connection. ` +
            'Prisma advisory locks do not work through a pooler — set the direct URL and re-run.',
        );
        summary.add('Failed', entry.service);
        break;
      }
      log.warn(`${entry.directDatabaseVariable} is not set — falling back to ${entry.databaseVariable}`);
    }

    let outcome;
    if (entry.engine === 'prisma') {
      const extensions = await ensureExtensions(entry, connectionString, dryRun);
      if (!extensions.ok) {
        log.error(extensions.message);
        summary.add('Failed', entry.service);
        break;
      }
      if (entry.hasMigrationsDirectory === false) {
        log.warn(`${entry.service} has no migrations directory — using "${entry.command}" (no reviewable history)`);
      }
      outcome = runPrisma(entry, connectionString, dryRun);
    } else if (entry.engine === 'mongodb') {
      outcome = await runMongoIndexes(entry, connectionString, dryRun);
    } else {
      outcome = { ok: false, message: `unknown engine "${entry.engine}"` };
    }

    if (!outcome.ok) {
      log.error(`${entry.service}: ${outcome.message}`);
      summary.add('Failed', entry.service);
      log.error('Stopping — later services may depend on this schema.');
      break;
    }

    log.ok(`${entry.service}: migrated`);
    summary.add('Updated', dryRun ? `${entry.service} (dry-run)` : entry.service);
  }

  for (const excluded of manifest.excluded) {
    summary.add('Skipped', `${excluded.service}`);
  }

  summary.print();
  return summary.failed ? 1 : 0;
}

await runScript('vercel:migrate', main);
