// Shared-package freshness. Every dependent resolves `@claw/shared-*` through
// the package's `dist/`, so typechecking or testing a dependent against a dist
// built from older source proves nothing about the current tree. This module
// rebuilds exactly the shared packages whose inputs changed since their last
// build — plus their shared dependents — in topological order, and reuses
// everything else.
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';

import { normalizeEol } from '../lib/fact.mjs';
import { npmInvocation } from '../lib/npm.mjs';
import { repoPath, walkFiles } from '../lib/repo.mjs';

const CACHE_DIR = repoPath('node_modules', '.cache', 'claw-shared-build');

/**
 * Shared packages in dependency order (dependencies before dependents), derived
 * from each package.json — never hard-coded. Ties break alphabetically so the
 * order is deterministic. Throws on a dependency cycle.
 */
export function sharedBuildOrder(workspaces) {
  const shared = workspaces.filter((ws) => ws.type === 'shared-package');
  const names = new Set(shared.map((ws) => ws.name));
  const pending = new Map(
    shared.map((ws) => [ws.name, ws.internalDeps.filter((dep) => dep !== ws.name && names.has(dep))]),
  );
  const order = [];
  while (pending.size > 0) {
    const ready = [...pending.entries()]
      .filter(([, deps]) => deps.every((dep) => order.includes(dep)))
      .map(([name]) => name)
      .sort();
    if (ready.length === 0) {
      throw new Error(`shared-package dependency cycle among: ${[...pending.keys()].join(', ')}`);
    }
    for (const name of ready) {
      order.push(name);
      pending.delete(name);
    }
  }
  return order;
}

function packageInputDigest(dir) {
  const hash = createHash('sha256');
  const files = [
    ...walkFiles(repoPath(dir, 'src'), (rel) => !/\/__tests__\/|\.spec\.ts$|\.test\.ts$/u.test(rel)),
    ...['package.json', 'tsconfig.json', 'tsconfig.build.json']
      .map((file) => repoPath(dir, file))
      .filter((file) => existsSync(file)),
  ];
  for (const file of files.sort()) {
    hash.update(file.slice(repoPath().length).replaceAll('\\', '/'));
    hash.update('\0');
    hash.update(normalizeEol(readFileSync(file, 'utf8')));
    hash.update('\0');
  }
  return hash.digest('hex');
}

/**
 * Input hash per shared package, chained through its shared dependencies so a
 * change to `shared-types` also invalidates every shared package built on it.
 */
export function sharedInputHashes(workspaces) {
  const byName = new Map(workspaces.map((ws) => [ws.name, ws]));
  const hashes = new Map();
  for (const name of sharedBuildOrder(workspaces)) {
    const ws = byName.get(name);
    const chained = createHash('sha256').update(packageInputDigest(ws.dir));
    for (const dep of ws.internalDeps.filter((d) => hashes.has(d)).sort()) {
      chained.update(`${dep}:${hashes.get(dep)}`);
    }
    hashes.set(name, chained.digest('hex'));
  }
  return hashes;
}

function stampPath(name) {
  return `${CACHE_DIR}/${name.replace('/', '__')}.hash`;
}

function readStamp(name) {
  try {
    return readFileSync(stampPath(name), 'utf8').trim();
  } catch {
    // No stamp yet means "never built by this tool" — the package is rebuilt.
    return null;
  }
}

/** Shared packages whose dist does not match their current inputs. */
export function staleSharedPackages(workspaces, hashes = sharedInputHashes(workspaces)) {
  const byName = new Map(workspaces.map((ws) => [ws.name, ws]));
  return sharedBuildOrder(workspaces).filter((name) => {
    const ws = byName.get(name);
    const builtEntry = repoPath(ws.dir, 'dist', 'index.js');
    return !existsSync(builtEntry) || readStamp(name) !== hashes.get(name);
  });
}

/**
 * Rebuild stale shared packages in topological order. Returns the names that
 * were rebuilt. Throws (with the package name) when a build fails.
 */
export function ensureSharedPackagesFresh(workspaces, { log = console.log } = {}) {
  const hashes = sharedInputHashes(workspaces);
  const stale = staleSharedPackages(workspaces, hashes);
  if (stale.length === 0) {
    log('shared packages: dist is current for every shared package');
    return [];
  }
  log(`shared packages: rebuilding ${stale.join(' → ')}`);
  for (const name of stale) {
    try {
      const [command, args, options] = npmInvocation(['run', 'build', '--workspace', name]);
      execFileSync(command, args, { ...options, stdio: ['ignore', 'pipe', 'pipe'] });
    } catch (error) {
      process.stderr.write(String(error.stdout ?? ''));
      process.stderr.write(String(error.stderr ?? ''));
      throw new Error(`shared package ${name} failed to build`);
    }
    mkdirSync(dirname(stampPath(name)), { recursive: true });
    writeFileSync(stampPath(name), `${hashes.get(name)}\n`, 'utf8');
  }
  return stale;
}
