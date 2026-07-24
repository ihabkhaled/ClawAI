// Shared repository primitives for the ClawAI AI-native engineering OS tooling.
// Node standard library only. Deterministic: all traversal is sorted so that
// unchanged source produces byte-identical output across runs and machines.
import { readFileSync, readdirSync, existsSync, statSync } from 'node:fs';
import { join, dirname, relative, sep } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

/**
 * True when `moduleUrl` (an import.meta.url) is the CLI entrypoint. Cross-OS
 * safe (handles the file:// vs file:/// difference on Windows). Use to guard
 * `main()` so importing a tool for its exports has no side effects.
 */
export function isMain(moduleUrl) {
  const entry = process.argv[1];
  if (!entry) return false;
  return moduleUrl === pathToFileURL(entry).href;
}

const HERE = dirname(fileURLToPath(import.meta.url));

/** Absolute path to the repository root (two levels up from tools/lib). */
export const REPO_ROOT = join(HERE, '..', '..');

/** Resolve a repo-relative path to absolute. */
export function repoPath(...parts) {
  return join(REPO_ROOT, ...parts);
}

/** Convert an absolute path to a forward-slash repo-relative path (stable across OSes). */
export function toRel(absPath) {
  return relative(REPO_ROOT, absPath).split(sep).join('/');
}

/** Read a UTF-8 file, returning null instead of throwing when it is absent. */
export function readText(absPath) {
  try {
    return readFileSync(absPath, 'utf8');
  } catch {
    return null;
  }
}

/** Read and parse a JSON file, returning null on absence or parse failure. */
export function readJson(absPath) {
  const raw = readText(absPath);
  if (raw === null) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

/** True when a path exists. */
export function exists(absPath) {
  return existsSync(absPath);
}

/**
 * List immediate child directory names of a directory, sorted. Returns [] when
 * the directory is absent so callers never need to guard.
 */
export function listDirs(absDir) {
  if (!existsSync(absDir)) return [];
  return readdirSync(absDir, { withFileTypes: true })
    .filter((e) => e.isDirectory())
    .map((e) => e.name)
    .sort();
}

/** List immediate child file names of a directory, sorted. */
export function listFiles(absDir) {
  if (!existsSync(absDir)) return [];
  return readdirSync(absDir, { withFileTypes: true })
    .filter((e) => e.isFile())
    .map((e) => e.name)
    .sort();
}

const DEFAULT_SKIP = new Set([
  'node_modules',
  '.git',
  'dist',
  'build',
  '.next',
  'coverage',
  'generated',
  '.audit',
  '.ai',
]);

/**
 * Recursively collect files under a directory, sorted, skipping heavy/generated
 * folders. `filter(relPath)` selects which files to keep.
 */
export function walkFiles(absDir, filter = () => true, skip = DEFAULT_SKIP) {
  const out = [];
  const stack = [absDir];
  const visited = [];
  while (stack.length > 0) {
    const dir = stack.pop();
    if (!existsSync(dir)) continue;
    const entries = readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      const full = join(dir, entry.name);
      if (entry.isDirectory()) {
        if (skip.has(entry.name)) continue;
        visited.push(full);
      } else if (entry.isFile()) {
        const rel = toRel(full);
        if (filter(rel)) out.push(full);
      }
    }
    // Deterministic order: push sorted-descending so pop yields ascending.
    visited.sort().reverse();
    while (visited.length > 0) stack.push(visited.pop());
  }
  return out.sort();
}

/** File size in bytes, or 0 when absent. */
export function fileSize(absPath) {
  try {
    return statSync(absPath).size;
  } catch {
    return 0;
  }
}

/**
 * Discover workspace directories from the root package.json `workspaces` globs.
 * Only supports the `<dir>/*` form the repo actually uses (packages/*, apps/*).
 */
export function discoverWorkspaces() {
  const rootPkg = readJson(repoPath('package.json'));
  const globs = (rootPkg && rootPkg.workspaces) || [];
  const result = [];
  for (const glob of [...globs].sort()) {
    if (!glob.endsWith('/*')) continue;
    const base = glob.slice(0, -2);
    for (const name of listDirs(repoPath(base))) {
      const dir = `${base}/${name}`;
      const pkg = readJson(repoPath(dir, 'package.json'));
      if (!pkg) continue;
      result.push({ dir, name: pkg.name ?? name, pkg });
    }
  }
  return result.sort((a, b) => (a.dir < b.dir ? -1 : a.dir > b.dir ? 1 : 0));
}
