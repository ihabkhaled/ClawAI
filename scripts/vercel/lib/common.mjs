/**
 * Shared helpers for every script under scripts/vercel/.
 *
 * Safety rules enforced here, not re-implemented per script:
 *   - Secret values are NEVER printed. Only names and a masked shape.
 *   - `production` is never the default target; callers must pass it.
 *   - Nothing is deleted unless the caller passes an explicit removal flag.
 */

import { readFileSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));

/** Repository root, resolved from this file's location (scripts/vercel/lib). */
export const REPO_ROOT = resolve(HERE, '..', '..', '..');

export const DEPLOY_DIR = join(REPO_ROOT, 'deploy', 'vercel');
export const GENERATED_DIR = join(DEPLOY_DIR, 'generated');

export const TARGET_PRODUCTION = 'production';
export const TARGET_PREVIEW = 'preview';
/** Preview is the default everywhere. Production always requires an explicit flag. */
export const DEFAULT_TARGET = TARGET_PREVIEW;

const VERCEL_API = 'https://api.vercel.com';

// ---------------------------------------------------------------- logging

const COLOR = process.env.NO_COLOR === undefined && process.stdout.isTTY === true;
const paint = (code, text) => (COLOR ? `[${code}m${text}[0m` : text);

export const log = {
  info: (message) => process.stdout.write(`${paint('36', 'info')}  ${message}\n`),
  ok: (message) => process.stdout.write(`${paint('32', 'ok')}    ${message}\n`),
  warn: (message) => process.stdout.write(`${paint('33', 'warn')}  ${message}\n`),
  error: (message) => process.stderr.write(`${paint('31', 'error')} ${message}\n`),
  step: (message) => process.stdout.write(`\n${paint('1', `── ${message}`)}\n`),
  plain: (message) => process.stdout.write(`${message}\n`),
};

/**
 * Render a secret for human eyes without leaking it.
 * Returns a length-and-shape description only — never any plaintext characters.
 */
export function maskValue(value) {
  if (value === undefined || value === null || value === '') {
    return '<empty>';
  }
  return `<set:${String(value).length} chars>`;
}

// ------------------------------------------------------------ arg parsing

/**
 * Minimal flag parser. Supports `--flag`, `--key value`, and `--key=value`.
 * Everything after a bare `--` is ignored so `npm run x -- --flag` works.
 */
export function parseArgs(argv = process.argv.slice(2)) {
  const flags = {};
  const positionals = [];
  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (token === '--') {
      continue;
    }
    if (!token.startsWith('--')) {
      positionals.push(token);
      continue;
    }
    const body = token.slice(2);
    const eq = body.indexOf('=');
    if (eq !== -1) {
      flags[body.slice(0, eq)] = body.slice(eq + 1);
      continue;
    }
    const next = argv[index + 1];
    if (next !== undefined && !next.startsWith('--')) {
      flags[body] = next;
      index += 1;
    } else {
      flags[body] = true;
    }
  }
  return { flags, positionals };
}

/**
 * Resolve the deployment target, defaulting to preview.
 * Guards against the "meant preview, hit production" failure mode.
 */
export function resolveTarget(flags) {
  const raw = flags.target;
  if (raw === undefined || raw === true) {
    return DEFAULT_TARGET;
  }
  const value = String(raw).toLowerCase();
  if (value !== TARGET_PRODUCTION && value !== TARGET_PREVIEW) {
    throw new Error(`--target must be "${TARGET_PREVIEW}" or "${TARGET_PRODUCTION}", got "${value}"`);
  }
  return value;
}

export function isDryRun(flags) {
  return flags['dry-run'] === true || flags['dry-run'] === 'true';
}

// -------------------------------------------------------------- manifests

export function loadJson(path) {
  if (!existsSync(path)) {
    throw new Error(`Manifest not found: ${path}`);
  }
  try {
    return JSON.parse(readFileSync(path, 'utf8'));
  } catch (error) {
    throw new Error(`Manifest is not valid JSON: ${path} — ${error.message}`);
  }
}

export function loadProjects() {
  return loadJson(join(DEPLOY_DIR, 'projects.json'));
}

export function loadEnvironmentManifest() {
  return loadJson(join(DEPLOY_DIR, 'environment.json'));
}

export function loadMigrationsManifest() {
  return loadJson(join(DEPLOY_DIR, 'migrations.json'));
}

/**
 * Select the projects a command should act on.
 *
 * `--service <key>` selects one (by key OR projectName) and is allowed even for
 * a disabled project, so an operator can explicitly re-enable one deployment —
 * but never for a `not-vercel-compatible` project, which always refuses.
 * `--all` (or no selector) selects every project whose status is `enabled`.
 */
export function selectProjects(manifest, flags) {
  const all = manifest.projects;
  const wanted = flags.service;

  if (typeof wanted === 'string' && wanted.length > 0) {
    const match = all.find((p) => p.key === wanted || p.projectName === wanted);
    if (match === undefined) {
      const known = all.map((p) => p.key).join(', ');
      throw new Error(`Unknown --service "${wanted}". Known keys: ${known}`);
    }
    if (match.status === 'not-vercel-compatible') {
      throw new Error(
        `Refusing to act on "${match.key}": ${match.notVercelCompatibleReason ?? 'not Vercel compatible.'}`,
      );
    }
    return [match];
  }

  return all.filter((p) => p.status === 'enabled');
}

/** Projects skipped by a default `--all` run, with the reason, for summary output. */
export function skippedProjects(manifest) {
  return manifest.projects
    .filter((p) => p.status !== 'enabled')
    .map((p) => ({
      key: p.key,
      status: p.status,
      reason: p.notVercelCompatibleReason ?? `status=${p.status}`,
    }));
}

/**
 * Order projects so every dependency is deployed before its dependents, and the
 * frontend lands last. Cycles are broken deterministically rather than throwing —
 * a dependency cycle should not block a deploy, only lose its ordering guarantee.
 */
export function topologicalOrder(projects) {
  const byKey = new Map(projects.map((p) => [p.key, p]));
  const visited = new Set();
  const settled = new Set();
  const ordered = [];

  const visit = (project) => {
    if (settled.has(project.key) || visited.has(project.key)) {
      return;
    }
    visited.add(project.key);
    for (const dependencyKey of project.dependencies ?? []) {
      const dependency = byKey.get(dependencyKey);
      if (dependency !== undefined) {
        visit(dependency);
      }
    }
    visited.delete(project.key);
    settled.add(project.key);
    ordered.push(project);
  };

  for (const project of projects.filter((p) => p.key !== 'frontend')) {
    visit(project);
  }
  const frontend = byKey.get('frontend');
  if (frontend !== undefined) {
    settled.add(frontend.key);
    ordered.push(frontend);
  }
  return ordered;
}

// ------------------------------------------------------------- env loading

/** Parse a dotenv-style file. Supports `export ` prefixes, `#` comments, and quotes. */
export function parseEnvFile(contents) {
  const result = {};
  for (const rawLine of contents.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (line === '' || line.startsWith('#')) {
      continue;
    }
    const withoutExport = line.startsWith('export ') ? line.slice(7).trim() : line;
    const eq = withoutExport.indexOf('=');
    if (eq === -1) {
      continue;
    }
    const key = withoutExport.slice(0, eq).trim();
    let value = withoutExport.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"') && value.length >= 2) ||
      (value.startsWith("'") && value.endsWith("'") && value.length >= 2)
    ) {
      value = value.slice(1, -1);
    }
    result[key] = value;
  }
  return result;
}

/**
 * Load .env.vercel, then overlay real process env so CI can supply secrets
 * without ever writing them to disk.
 */
export function loadDeploymentEnv(flags = {}) {
  const file = typeof flags['env-file'] === 'string' ? flags['env-file'] : '.env.vercel';
  const path = resolve(REPO_ROOT, file);
  const fromFile = existsSync(path) ? parseEnvFile(readFileSync(path, 'utf8')) : {};
  if (!existsSync(path)) {
    log.warn(`${file} not found — relying on process environment only.`);
  }
  const merged = { ...fromFile };
  for (const [key, value] of Object.entries(process.env)) {
    if (value !== undefined && value !== '') {
      merged[key] = value;
    }
  }
  return { values: merged, fromFile: Object.keys(fromFile), path };
}

// ------------------------------------------------------------ Vercel API

export function readVercelCredentials(env) {
  const token = env.VERCEL_TOKEN;
  if (token === undefined || token === '') {
    throw new Error('VERCEL_TOKEN is not set. Add it to .env.vercel or export it in the environment.');
  }
  return {
    token,
    teamId: env.VERCEL_TEAM_ID !== undefined && env.VERCEL_TEAM_ID !== '' ? env.VERCEL_TEAM_ID : undefined,
    gitRepository: env.VERCEL_GIT_REPOSITORY ?? 'ihabkhaled/ClawAI',
    productionBranch: env.VERCEL_PRODUCTION_BRANCH ?? 'main',
  };
}

/**
 * Thin Vercel REST client. Returns `{ ok, status, body }` rather than throwing
 * so callers can treat 404 as "does not exist" without exception handling.
 * The token is only ever placed in the Authorization header — never logged.
 */
export async function vercelRequest(credentials, method, path, body) {
  const url = new URL(path.startsWith('http') ? path : `${VERCEL_API}${path}`);
  if (credentials.teamId !== undefined) {
    url.searchParams.set('teamId', credentials.teamId);
  }
  const response = await fetch(url, {
    method,
    headers: {
      Authorization: `Bearer ${credentials.token}`,
      'Content-Type': 'application/json',
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });

  const text = await response.text();
  let parsed;
  try {
    parsed = text === '' ? {} : JSON.parse(text);
  } catch {
    parsed = { raw: text };
  }
  return { ok: response.ok, status: response.status, body: parsed };
}

/** Human-readable error from a Vercel API envelope, with no credential echo. */
export function vercelErrorMessage(result) {
  const error = result.body?.error;
  if (error !== undefined) {
    return `${error.code ?? 'error'}: ${error.message ?? 'unknown'} (HTTP ${result.status})`;
  }
  return `HTTP ${result.status}`;
}

// ---------------------------------------------------------------- output

export function ensureGeneratedDir() {
  if (!existsSync(GENERATED_DIR)) {
    mkdirSync(GENERATED_DIR, { recursive: true });
  }
  return GENERATED_DIR;
}

export function writeGenerated(filename, contents) {
  ensureGeneratedDir();
  const path = join(GENERATED_DIR, filename);
  writeFileSync(path, contents, 'utf8');
  return path;
}

// --------------------------------------------------------------- summary

/**
 * Standard five-bucket run summary. Every script prints this so operators read
 * the same shape regardless of which step they ran.
 */
export class RunSummary {
  constructor(title) {
    this.title = title;
    this.buckets = {
      Created: [],
      Existing: [],
      Updated: [],
      Skipped: [],
      Failed: [],
    };
  }

  add(bucket, entry) {
    this.buckets[bucket].push(entry);
  }

  print() {
    log.step(`${this.title} summary`);
    for (const [bucket, entries] of Object.entries(this.buckets)) {
      const body = entries.length === 0 ? '—' : entries.join(', ');
      log.plain(`${bucket.padEnd(9)}: ${body}`);
    }
  }

  get failed() {
    return this.buckets.Failed.length > 0;
  }
}

/** Wrap a script main() so unexpected errors exit non-zero with a clean message. */
export async function runScript(name, main) {
  try {
    const code = await main();
    process.exit(typeof code === 'number' ? code : 0);
  } catch (error) {
    log.error(`${name} failed: ${error.message}`);
    if (process.env.VERCEL_AUTOMATION_DEBUG === '1' && error.stack !== undefined) {
      log.plain(error.stack);
    }
    process.exit(1);
  }
}
