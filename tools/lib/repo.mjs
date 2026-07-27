// Shared repository primitives for the ClawAI AI-native engineering OS tooling.
// Node standard library only. Deterministic: all traversal is sorted so that
// unchanged source produces byte-identical output across runs and machines.
import { readFileSync, readdirSync, existsSync, statSync } from 'node:fs';
import { join, dirname, relative, sep } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

import { normalizeEol } from './fact.mjs';

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
  // Agent scratch space. `.claude/worktrees/*` holds FULL copies of the
  // repository — services, schemas, event declarations and all. Walking into it
  // makes the generators describe files that are not in the repo, so the
  // manifests come out different on a machine that has used worktrees than in
  // CI, which has none. That divergence surfaces only as `knowledge:verify
  // FAILED — stale generated file` with locally-clean output, which is
  // needlessly hard to diagnose. Same class of error as the working-tree
  // pollution fixed in 6baf1c54.
  '.claude',
  // Local Playwright/Lighthouse output.
  '.lighthouseci',
  'test-results',
  'playwright-report',
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
    // Measured on LF-normalised content, NOT statSync().size.
    //
    // The on-disk size of a text file depends on the checkout: with
    // `core.autocrlf=true` a Windows working tree stores CRLF, making every file
    // one byte larger per line than the same commit checked out on Linux. Feeding
    // that into a manifest makes the manifest platform-dependent, so a Windows
    // contributor and CI generate different bytes from identical source and the
    // freshness gate fails with locally-clean output — a genuinely hard failure to
    // read, because `git status` shows nothing wrong.
    //
    // Normalising here keeps the manifest a property of the CONTENT, which is what
    // it is supposed to describe.
    return normalizeEol(readFileSync(absPath, 'utf8')).length;
  } catch {
    return 0;
  }
}

/**
 * Discover workspace directories from the root package.json `workspaces` globs.
 * Supports an exact workspace path or a wildcard in the final path segment.
 * Keeping expansion at one directory level prevents workspace discovery from
 * descending into nested repositories and submodules.
 */
export function discoverWorkspaces() {
  const rootPkg = readJson(repoPath('package.json'));
  const globs = (rootPkg && rootPkg.workspaces) || [];
  const result = [];
  for (const glob of [...globs].sort()) {
    const separator = glob.lastIndexOf('/');
    if (separator < 1) continue;
    const base = glob.slice(0, separator);
    const segment = glob.slice(separator + 1);
    if (base.includes('*') || segment.length === 0) continue;
    const pattern = new RegExp(
      `^${segment.replace(/[\\^$.[\]{}()+?|]/gu, '\\$&').replaceAll('*', '.*')}$`,
      'u',
    );
    for (const name of listDirs(repoPath(base)).filter((entry) => pattern.test(entry))) {
      const dir = `${base}/${name}`;
      const pkg = readJson(repoPath(dir, 'package.json'));
      if (!pkg) continue;
      result.push({ dir, name: pkg.name ?? name, pkg });
    }
  }
  return result.sort((a, b) => (a.dir < b.dir ? -1 : a.dir > b.dir ? 1 : 0));
}
