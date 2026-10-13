#!/usr/bin/env node
// Changed-lines coverage for a pull request. A workspace's average can sit
// well below the target for years; this holds every line a PR adds or changes
// in workspace source to the target on its own.
//
//   node tools/coverage/changed-lines.mjs normalize <workspaceDir> <lcov.info>   (stdout)
//   node tools/coverage/changed-lines.mjs --base=<sha> [--head=<sha>] <normalized lcov>...
//
// vitest writes lcov SF paths relative to the workspace; `normalize` rewrites
// them repo-relative in each test job so the PR job can merge every workspace.
// Only lines the coverage tool instruments count (declarations, comments and
// type-only lines have no DA record), and test files never count.
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { isAbsolute, posix, relative } from 'node:path';

import { isMain, readJson, repoPath } from '../lib/repo.mjs';

const SOURCE = /^(?:apps|packages)\/[^/]+\/src\/.+\.(?:ts|tsx)$/u;
const NOT_SOURCE = /\/__tests__\/|\.(?:spec|test)\.tsx?$|\.d\.ts$|\/generated\//u;
const DEFAULT_TARGET = 80;

/** `{ file -> Set(line) }` of lines added or changed, from `git diff --unified=0`. */
export function parseDiff(diffText) {
  const changed = new Map();
  let file = null;
  for (const line of diffText.split('\n')) {
    if (line.startsWith('+++ ')) {
      const path = line.slice(4).trim();
      file = path === '/dev/null' ? null : path.replace(/^b\//u, '');
      continue;
    }
    const hunk = /^@@ -\d+(?:,\d+)? \+(\d+)(?:,(\d+))? @@/u.exec(line);
    if (hunk && file && SOURCE.test(file) && !NOT_SOURCE.test(file)) {
      const start = Number(hunk[1]);
      const count = hunk[2] === undefined ? 1 : Number(hunk[2]);
      const lines = changed.get(file) ?? new Set();
      for (let n = start; n < start + count; n += 1) lines.add(n);
      changed.set(file, lines);
    }
  }
  return changed;
}

function repoRelative(raw, workspaceDir) {
  const forward = raw.split('\\').join('/');
  if (isAbsolute(raw)) return relative(repoPath(), raw).split('\\').join('/');
  return posix.normalize(posix.join(workspaceDir, forward));
}

/** lcov text with every SF path made repo-relative. */
export function normalizeLcov(lcovText, workspaceDir) {
  return lcovText
    .split(/\r?\n/u)
    .map((line) => (line.startsWith('SF:') ? `SF:${repoRelative(line.slice(3).trim(), workspaceDir)}` : line))
    .join('\n');
}

/** `{ repo-relative file -> Map(line -> hits) }` from normalized lcov text. */
export function parseLcov(lcovText) {
  const out = new Map();
  let file = null;
  for (const line of lcovText.split(/\r?\n/u)) {
    if (line.startsWith('SF:')) {
      file = repoRelative(line.slice(3).trim(), '');
      if (!out.has(file)) out.set(file, new Map());
    } else if (line.startsWith('DA:') && file) {
      const [lineNo, hits] = line.slice(3).split(',').map(Number);
      const lines = out.get(file);
      lines.set(lineNo, Math.max(lines.get(lineNo) ?? 0, hits));
    } else if (line === 'end_of_record') {
      file = null;
    }
  }
  return out;
}

/** Coverage of the changed lines that the coverage tool instruments. */
export function changedLineCoverage(changed, coverage) {
  let total = 0;
  let covered = 0;
  const uncovered = [];
  for (const [file, lines] of changed) {
    const hits = coverage.get(file);
    if (!hits) continue;
    for (const line of [...lines].sort((a, b) => a - b)) {
      if (!hits.has(line)) continue;
      total += 1;
      if (hits.get(line) > 0) covered += 1;
      else uncovered.push(`${file}:${line}`);
    }
  }
  return { total, covered, percent: total === 0 ? 100 : (covered / total) * 100, uncovered };
}

/** Changed source files with no coverage record at all (their workspace was not tested). */
export function unmeasuredFiles(changed, coverage) {
  return [...changed.keys()].filter((file) => !coverage.has(file)).sort();
}

function mergeCoverage(paths) {
  const coverage = new Map();
  for (const path of paths) {
    for (const [file, lines] of parseLcov(readFileSync(path, 'utf8'))) {
      const merged = coverage.get(file) ?? new Map();
      for (const [line, hits] of lines) merged.set(line, Math.max(merged.get(line) ?? 0, hits));
      coverage.set(file, merged);
    }
  }
  return coverage;
}

function main() {
  if (process.argv[2] === 'normalize') {
    const [, , , workspaceDir, lcovPath] = process.argv;
    process.stdout.write(normalizeLcov(readFileSync(lcovPath, 'utf8'), workspaceDir));
    return;
  }
  const base = process.argv.find((a) => a.startsWith('--base='))?.slice(7);
  const head = process.argv.find((a) => a.startsWith('--head='))?.slice(7) ?? 'HEAD';
  const lcovFiles = process.argv.slice(2).filter((a) => !a.startsWith('--'));
  if (!base) {
    console.error('usage: changed-lines.mjs --base=<sha> [--head=<sha>] <normalized lcov>...');
    process.exit(2);
  }
  const target = readJson(repoPath('tools/coverage/thresholds.json'))?.changedLines ?? DEFAULT_TARGET;
  const diff = execFileSync('git', ['diff', '--unified=0', `${base}...${head}`], {
    encoding: 'utf8',
    maxBuffer: 256 * 1024 * 1024,
  });
  const changed = parseDiff(diff);
  const coverage = mergeCoverage(lcovFiles);
  const result = changedLineCoverage(changed, coverage);
  for (const file of unmeasuredFiles(changed, coverage)) {
    console.log(`  · no coverage record for ${file} (excluded by its coverage config, or no test job ran)`);
  }
  console.log(
    `changed-lines coverage: ${result.covered}/${result.total} instrumented changed lines covered ` +
      `(${result.percent.toFixed(1)}%, target ${target}%)`,
  );
  if (result.percent < target) {
    for (const location of result.uncovered.slice(0, 50)) console.error(`  ✖ not covered: ${location}`);
    process.exit(1);
  }
}

if (isMain(import.meta.url)) main();
