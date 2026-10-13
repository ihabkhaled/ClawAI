// Root-invariant checks for the local hooks. A change outside every workspace —
// the lockfile, the ESLint config, a root tsconfig, the hooks themselves — used
// to print "local scope" and run nothing at all. Each class below now runs the
// cheapest check that can actually fail for it; CI still runs the full
// all-workspace pass on any root-invariant change.
import { readJson, repoPath } from '../lib/repo.mjs';
import { npmInvocation } from '../lib/npm.mjs';

const LOCKFILE = /^(?:package-lock\.json|(?:apps|packages)\/[^/]+\/package\.json|package\.json|\.npmrc)$/u;
const ESLINT_CONFIG = /^(?:eslint\.config\.(?:mjs|cjs|js)|eslint\/|\.lintstagedrc\.cjs$)/u;
const ROOT_TSCONFIG = /^tsconfig[^/]*\.json$/u;
const TOOLING = /^(?:tools\/|scripts\/|eslint\/|\.husky\/)/u;

/** Paths under these trees are lintable by the root ESLint config. */
const LINTABLE = /^(?:apps|packages)\/[^/]+\/src\/.*\.(?:ts|tsx)$/u;

/** A small, always-present file used to prove the ESLint config still loads. */
export const ESLINT_CANARY = 'packages/shared-constants/src/index.ts';

function tsconfigExtends(workspaceDir, rootConfig) {
  const config = readJson(repoPath(workspaceDir, 'tsconfig.json'));
  const parents = [config?.extends].flat().filter(Boolean);
  return parents.some((parent) => parent.replace(/^(?:\.\.\/)+/u, '') === rootConfig);
}

/**
 * The root checks a set of changed files calls for, as runnable tasks.
 * `includeTooling` adds the tooling test suite (pre-push only; it is the
 * slowest root check and pre-commit must stay fast).
 */
export function planRootChecks(files, workspaces, { includeTooling = false } = {}) {
  const tasks = [];
  const reasons = [];
  const npmTask = (name, args) => {
    const [command, commandArgs, options] = npmInvocation(args);
    tasks.push({ name, command, args: commandArgs, options });
  };

  if (files.some((f) => LOCKFILE.test(f))) {
    reasons.push('lockfile/package.json changed → lockfile consistency (npm ci --dry-run)');
    npmTask('lockfile-consistency', ['ci', '--dry-run', '--ignore-scripts', '--no-audit', '--no-fund']);
  }

  if (files.some((f) => ESLINT_CONFIG.test(f))) {
    const lintable = files.filter((f) => LINTABLE.test(f));
    const targets = lintable.length > 0 ? lintable : [ESLINT_CANARY];
    reasons.push(`ESLint config changed → architecture:check + lint ${targets.length} file(s)`);
    npmTask('architecture-check', ['run', 'architecture:check']);
    tasks.push({
      name: 'eslint-config-loads',
      command: process.execPath,
      args: ['node_modules/eslint/bin/eslint.js', '--max-warnings', '0', ...targets],
      options: {},
    });
  }

  for (const config of files.filter((f) => ROOT_TSCONFIG.test(f))) {
    const extenders = workspaces.filter((ws) => tsconfigExtends(ws.dir, config));
    reasons.push(`${config} changed → typecheck ${extenders.length} extending workspace(s)`);
    for (const ws of extenders) npmTask(`typecheck ${ws.name}`, ['run', 'typecheck', '--workspace', ws.name]);
  }

  if (includeTooling && files.some((f) => TOOLING.test(f))) {
    reasons.push('tools/scripts/eslint/hooks changed → tooling tests (deploy rehearsal runs in CI)');
    npmTask('tooling-tests', ['run', 'knowledge:test:fast']);
    if (files.some((f) => /^eslint\//u.test(f))) npmTask('architecture-check', ['run', 'architecture:check']);
  }

  // Two classes can schedule architecture:check; run it once.
  const unique = [];
  for (const task of tasks) {
    if (!unique.some((existing) => existing.name === task.name)) unique.push(task);
  }
  return { reasons, tasks: unique };
}
