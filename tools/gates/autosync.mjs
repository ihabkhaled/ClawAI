#!/usr/bin/env node
// Pre-commit auto-sync (ADR-202): every gate whose fix is deterministic and
// derived is satisfied HERE, from the staged set, and the result is staged so
// the commit carries it. One line is printed per auto-fix. Nothing here
// judges anything: it only removes ratchet debt that is provably gone, raises
// recorded floors to the declared values, and re-derives generated numbers.
//
//   1. format baseline    drop entries whose file was deleted or whose staged
//                         bytes no longer match the recorded hash (the entry can
//                         never grant a legacy pass again; check still judges the file)
//   2. lint baseline      drop entries for staged source files (lint-staged just
//                         proved them at 0 warnings with --max-warnings 0) and
//                         for deleted files
//   3. coverage table     `thresholds.mjs sync` when a vitest config is staged
//                         (records declared thresholds, never lowers one)
//   4. dependency audit   tools/security/audit-fix.mjs --hook (throttled)
//
// A baseline file with UNSTAGED edits is never touched (that would sweep
// someone's in-flight work into the commit).
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';

import { createHash } from 'node:crypto';

import { git, gitLines } from '../lib/git.mjs';
import { normalizeEol, stableStringify } from '../lib/fact.mjs';
import { isMain, readJson, repoPath } from '../lib/repo.mjs';

/** Same digest tools/format/ratchet.mjs records (kept local: that module loads prettier). */
export const formattingContentHash = (source) =>
  createHash('sha256').update(normalizeEol(source)).digest('hex');

const FORMAT_BASELINE = 'tools/format/baseline.json';
const LINT_BASELINE = 'tools/lint/warnings-baseline.json';
const COVERAGE_TABLE = 'tools/coverage/thresholds.json';
const LINTED = /\.(?:ts|tsx|js|jsx)$/u;

/** Format-baseline entries that can no longer apply. */
export function deadFormatEntries(violations, { inIndex, stagedBlob }) {
  const dead = [];
  for (const [path, recorded] of Object.entries(violations)) {
    if (!inIndex(path)) {
      dead.push(path);
      continue;
    }
    const blob = stagedBlob(path);
    if (blob !== null && formattingContentHash(blob) !== recorded) dead.push(path);
  }
  return dead.sort();
}

/** Lint-baseline files to drop: deleted, or staged and therefore proven clean by lint-staged. */
export function deadLintEntries(warnings, { staged, inIndex, lintStagedCovers }) {
  const stagedSet = new Set(staged);
  return Object.keys(warnings)
    .filter((file) => !inIndex(file) || (stagedSet.has(file) && lintStagedCovers(file)))
    .sort();
}

/** Mirrors .lintstagedrc.cjs: which files its ESLint step lints. */
export function lintStagedCovers(file) {
  return (
    LINTED.test(file) &&
    !file.includes('agent-cli/') &&
    !file.startsWith('.ai/') &&
    !file.endsWith('/AGENTS.md')
  );
}

const hasUnstaged = (rel) => {
  try {
    git(['diff', '--quiet', '--', rel]);
    return false;
  } catch {
    return true;
  }
};

function indexPaths() {
  return new Set(gitLines(['ls-files']));
}

function stagedFiles() {
  return gitLines(['diff', '--cached', '--name-only', '--diff-filter=ACMR']);
}

function stagedBlob(path) {
  try {
    return execFileSync('git', ['show', `:${path}`], {
      encoding: 'utf8',
      maxBuffer: 64 * 1024 * 1024,
      stdio: ['ignore', 'pipe', 'ignore'],
    });
  } catch {
    return null;
  }
}

function writeAndStage(rel, text, line) {
  if (normalizeEol(readFileSync(repoPath(rel), 'utf8')) === normalizeEol(text)) return false;
  writeFileSync(repoPath(rel), text);
  git(['add', '--', rel]);
  console.log(`autosync: ${line}`);
  return true;
}

function syncFormatBaseline(index) {
  if (!existsSync(repoPath(FORMAT_BASELINE)) || hasUnstaged(FORMAT_BASELINE)) return;
  const document = readJson(repoPath(FORMAT_BASELINE));
  if (!document?.violations) return;
  const dead = deadFormatEntries(document.violations, { inIndex: (p) => index.has(p), stagedBlob });
  if (dead.length === 0) return;
  const next = {
    ...document,
    violations: Object.fromEntries(
      Object.entries(document.violations).filter(([p]) => !dead.includes(p)),
    ),
  };
  writeAndStage(
    FORMAT_BASELINE,
    stableStringify(next),
    `format baseline shrank by ${dead.length} entr${dead.length === 1 ? 'y' : 'ies'} (staged)`,
  );
}

function syncLintBaseline(index, staged) {
  if (!existsSync(repoPath(LINT_BASELINE)) || hasUnstaged(LINT_BASELINE)) return;
  const document = readJson(repoPath(LINT_BASELINE));
  if (!document?.warnings) return;
  const dead = deadLintEntries(document.warnings, {
    staged,
    inIndex: (p) => index.has(p),
    lintStagedCovers,
  });
  if (dead.length === 0) return;
  const warnings = Object.fromEntries(
    Object.entries(document.warnings).filter(([f]) => !dead.includes(f)),
  );
  writeAndStage(
    LINT_BASELINE,
    stableStringify({ warnings }),
    `lint warning baseline shrank by ${dead.length} file(s) (staged)`,
  );
}

function syncCoverageTable(staged) {
  if (
    !staged.some((f) => /(^|\/)vitest\.config\.[cm]?[jt]s$/u.test(f)) ||
    hasUnstaged(COVERAGE_TABLE)
  )
    return;
  execFileSync(process.execPath, ['tools/coverage/thresholds.mjs', 'sync'], { stdio: 'ignore' });
  try {
    git(['diff', '--quiet', '--', COVERAGE_TABLE]);
  } catch {
    git(['add', '--', COVERAGE_TABLE]);
    console.log('autosync: coverage threshold table recorded the declared thresholds (staged)');
  }
}

function syncAudit() {
  try {
    execFileSync(process.execPath, ['tools/security/audit-fix.mjs', '--hook'], {
      stdio: 'inherit',
    });
    return true;
  } catch {
    return false;
  }
}

export function autosync() {
  const staged = stagedFiles();
  const index = indexPaths();
  syncFormatBaseline(index);
  syncLintBaseline(index, staged);
  syncCoverageTable(staged);
  return syncAudit();
}

if (isMain(import.meta.url)) {
  try {
    process.exit(autosync() ? 0 : 1);
  } catch (error) {
    console.error(`✖ autosync: ${error.message}`);
    process.exit(1);
  }
}
