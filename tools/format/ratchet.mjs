#!/usr/bin/env node
// Repository-wide formatting gate with a monotonic legacy-debt ratchet.
//
// `check` rejects every new or modified Prettier violation while allowing only
// byte-identical entries from the generated baseline. `baseline` can prune
// resolved debt; `baseline --bootstrap` is reserved for establishing the first
// baseline and refuses to overwrite an existing one.
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';

import prettier from 'prettier';

import { cmp, normalizeEol, stableStringify } from '../lib/fact.mjs';
import { isMain, readJson, repoPath } from '../lib/repo.mjs';

const BASELINE_PATH = repoPath('tools', 'format', 'baseline.json');
const FORMAT_EXTENSIONS = /\.(?:css|json|md|ts|tsx)$/u;
const IGNORE_PATHS = ['.gitignore', '.prettierignore'];
const WORKER_COUNT = 12;

export function formattingContentHash(source) {
  return createHash('sha256').update(normalizeEol(source)).digest('hex');
}

function isViolation(candidate) {
  return normalizeEol(candidate.source) !== normalizeEol(candidate.formatted);
}

export function evaluateFormattingDebt(candidates, baseline) {
  const clean = [];
  const failures = [];
  const legacy = [];

  for (const candidate of [...candidates].sort((left, right) => cmp(left.path, right.path))) {
    if (!isViolation(candidate)) {
      clean.push(candidate.path);
      continue;
    }

    const currentHash = formattingContentHash(candidate.source);
    if (baseline[candidate.path] === currentHash) legacy.push(candidate.path);
    else failures.push(candidate.path);
  }

  return { clean, failures, legacy };
}

export function buildFormattingBaseline(candidates, existing = {}, options = {}) {
  const baseline = {};
  for (const candidate of [...candidates].sort((left, right) => cmp(left.path, right.path))) {
    if (!isViolation(candidate)) continue;
    const currentHash = formattingContentHash(candidate.source);
    if (options.bootstrap === true || existing[candidate.path] === currentHash) {
      baseline[candidate.path] = currentHash;
    }
  }
  return baseline;
}

function trackedFormattingFiles() {
  return execFileSync('git', ['ls-files', '-z'], { cwd: repoPath(), encoding: 'utf8' })
    .split('\0')
    .filter((path) => FORMAT_EXTENSIONS.test(path))
    .sort(cmp);
}

async function readCandidate(path) {
  const info = await prettier.getFileInfo(repoPath(path), { ignorePath: IGNORE_PATHS });
  if (info.ignored || info.inferredParser === null) return null;

  const source = readFileSync(repoPath(path), 'utf8');
  const config = await prettier.resolveConfig(repoPath(path));
  const formatted = await prettier.format(source, { ...config, filepath: repoPath(path) });
  return { path, source, formatted };
}

export async function scanFormattingCandidates(paths = trackedFormattingFiles()) {
  const candidates = [];
  let cursor = 0;

  async function worker() {
    while (cursor < paths.length) {
      const path = paths[cursor];
      cursor += 1;
      const candidate = await readCandidate(path);
      if (candidate !== null) candidates.push(candidate);
    }
  }

  await Promise.all(Array.from({ length: WORKER_COUNT }, () => worker()));
  return candidates.sort((left, right) => cmp(left.path, right.path));
}

function readBaseline() {
  const document = readJson(BASELINE_PATH);
  if (document?.schemaVersion !== 1 || typeof document.violations !== 'object') {
    throw new Error(
      'Formatting baseline is missing or invalid. Run `npm run format:baseline -- --bootstrap` once.',
    );
  }
  return document.violations;
}

function writeBaseline(violations) {
  const document = {
    generatedBy: 'npm run format:baseline',
    instructions:
      'Generated file. Do not edit by hand. The default command only prunes resolved debt.',
    schemaVersion: 1,
    violations,
  };
  mkdirSync(dirname(BASELINE_PATH), { recursive: true });
  writeFileSync(BASELINE_PATH, stableStringify(document));
}

async function check() {
  const candidates = await scanFormattingCandidates();
  const result = evaluateFormattingDebt(candidates, readBaseline());
  if (result.failures.length === 0) {
    console.log(
      `format:check OK - ${result.legacy.length} unchanged legacy violations are ratcheted; no new debt.`,
    );
    return;
  }

  console.error(
    `format:check FAILED - ${result.failures.length} new or modified file(s) need Prettier formatting:`,
  );
  for (const path of result.failures.slice(0, 50)) console.error(`  ${path}`);
  if (result.failures.length > 50) {
    console.error(`  ...and ${result.failures.length - 50} more`);
  }
  process.exitCode = 1;
}

async function baseline() {
  const bootstrap = process.argv.includes('--bootstrap');
  const existingDocument = readJson(BASELINE_PATH);
  if (bootstrap && existingDocument !== null) {
    throw new Error('Refusing to bootstrap over an existing formatting baseline.');
  }

  const existing = bootstrap ? {} : readBaseline();
  const candidates = await scanFormattingCandidates();
  const violations = buildFormattingBaseline(candidates, existing, { bootstrap });
  writeBaseline(violations);
  console.log(
    `Formatting baseline generated deterministically with ${Object.keys(violations).length} entries.`,
  );
}

async function main() {
  const command = process.argv[2];
  if (command === 'check') await check();
  else if (command === 'baseline') await baseline();
  else throw new Error('Usage: node tools/format/ratchet.mjs <check|baseline> [--bootstrap]');
}

if (isMain(import.meta.url)) await main();
