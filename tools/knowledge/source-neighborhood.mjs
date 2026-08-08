import { execFileSync } from 'node:child_process';

import { cmp } from '../lib/fact.mjs';
import { REPO_ROOT } from '../lib/repo.mjs';

const MODE_LIMITS = Object.freeze({ FAST: 8, NORMAL: 16, DEEP: 32, AUDIT: 64 });
const SOURCE_PATTERN = /\.(?:cjs|css|js|jsx|json|md|mjs|prisma|sh|ts|tsx|yml|yaml)$/u;
const TEST_PATTERN = /(?:__tests__|\/tests?\/|\.(?:spec|test)\.)/u;

function taskTerms(task) {
  return [
    ...new Set(
      task
        .toLowerCase()
        .split(/[^a-z0-9]+/u)
        .filter((term) => term.length > 2),
    ),
  ];
}

export function trackedFiles() {
  const output = execFileSync('git', ['ls-files'], { cwd: REPO_ROOT, encoding: 'utf8' });
  return output.split(/\r?\n/u).filter((file) => SOURCE_PATTERN.test(file));
}

function scoreFile(file, terms) {
  const lower = file.toLowerCase();
  let score = 0;
  for (const term of terms) {
    if (lower.includes(term)) score += lower.split(term).length;
  }
  if (lower.startsWith('apps/') || lower.startsWith('packages/')) score += 1;
  if (/\/(?:src|rules|skills|context)\//u.test(`/${lower}`)) score += 1;
  return score;
}

function rank(files, terms, limit) {
  return files
    .map((file) => ({ file, score: scoreFile(file, terms) }))
    .filter((entry) => entry.score > 0)
    .sort((left, right) => right.score - left.score || cmp(left.file, right.file))
    .slice(0, limit)
    .map((entry) => entry.file);
}

export function compileSourceNeighborhood(task, options = {}) {
  const mode = MODE_LIMITS[options.mode] ? options.mode : 'NORMAL';
  const limit = MODE_LIMITS[mode];
  const terms = taskTerms(task);
  const tracked = trackedFiles();
  const tests = rank(
    tracked.filter((file) => TEST_PATTERN.test(file)),
    terms,
    Math.max(4, limit / 2),
  );
  const files = rank(
    tracked.filter((file) => !TEST_PATTERN.test(file)),
    terms,
    limit,
  );
  return { mode, files, tests, trackedFileCount: tracked.length };
}
