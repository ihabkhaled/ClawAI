import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import test from 'node:test';

import {
  changedFiles,
  computeAffectedFromFiles,
  loadWorkspaces,
  planGate,
  poolableTasks,
  testConcurrency,
  testInvocation,
} from '../affected/index.mjs';
import { gateJobs } from '../affected/pool.mjs';
import { ESLINT_CANARY, planRootChecks } from '../affected/root-checks.mjs';
import { sharedBuildOrder, sharedInputHashes, staleSharedPackages } from '../affected/shared-build.mjs';
import { prePush } from '../gates/pre-push.mjs';
import { git, parsePrePushRefs, resolveDefaultBase, ZERO_SHA } from '../lib/git.mjs';
import { repoPath } from '../lib/repo.mjs';
import { checkEveryWorkspaceHasTests } from '../knowledge/verify.mjs';

// Every gate below used to be able to go green without checking anything.
// Each test pins the loud failure that replaced the silent pass.

const fake = [
  { dir: 'apps/claw-chat-service', name: 'claw-chat-service', type: 'nestjs-service', internalDeps: ['@claw/shared-utilities'], scripts: ['typecheck', 'test', 'test:related', 'build', 'lint'] },
  { dir: 'apps/claw-auth-service', name: 'claw-auth-service', type: 'nestjs-service', internalDeps: ['@claw/shared-types'], scripts: ['typecheck', 'test', 'build'] },
  { dir: 'packages/shared-utilities', name: '@claw/shared-utilities', type: 'shared-package', internalDeps: ['@claw/shared-constants', '@claw/shared-types'], scripts: ['typecheck', 'test', 'build'] },
  { dir: 'packages/shared-types', name: '@claw/shared-types', type: 'shared-package', internalDeps: [], scripts: ['typecheck', 'test', 'build'] },
  { dir: 'packages/shared-constants', name: '@claw/shared-constants', type: 'shared-package', internalDeps: ['@claw/shared-types'], scripts: ['typecheck', 'test', 'build'] },
];

test('a comparison base that does not resolve fails instead of reporting zero changes', () => {
  assert.throws(() => changedFiles('origin/DOES-NOT-EXIST'), /does not resolve to a commit/u);
  const cli = spawnSync(process.execPath, ['tools/affected/index.mjs', 'list', '--base=origin/DOES-NOT-EXIST'], {
    cwd: repoPath(),
    encoding: 'utf8',
  });
  assert.equal(cli.status, 1);
  assert.match(cli.stderr, /does not resolve/u);
});

test('CLAW_GATE_BASE overrides the default base and must resolve', () => {
  assert.equal(resolveDefaultBase({ env: { CLAW_GATE_BASE: 'HEAD' } }), 'HEAD');
  assert.throws(() => resolveDefaultBase({ env: { CLAW_GATE_BASE: 'no-such-ref-anywhere' } }), /does not resolve/u);
});

test('the pre-push hook no longer retries a failing suite against a second base', () => {
  const hook = readFileSync(repoPath('.husky/pre-push'), 'utf8');
  assert.doesNotMatch(hook, /--base=origin\/HEAD \|\|/u);
  assert.doesNotMatch(hook, /\|\|\s*\n\s*node tools\/affected/u);
});

test('pre-push stdin is parsed per ref and deletions are skipped', () => {
  const sha = 'c'.repeat(40);
  const refs = parsePrePushRefs(
    `refs/heads/a ${sha} refs/heads/a ${ZERO_SHA}\r\n(delete) ${ZERO_SHA} refs/heads/gone ${'d'.repeat(40)}\n\n`,
  );
  assert.deepEqual(refs, [{ localRef: 'refs/heads/a', localSha: sha, remoteRef: 'refs/heads/a', remoteSha: ZERO_SHA }]);
});

test('pushing a ref whose tree is not checked out fails without a receipt for it', async () => {
  // An empty-tree commit: never checked out and never receipted, unlike HEAD~1,
  // whose tree a real `gates:receipt` run may already cover.
  const emptyTree = git(['hash-object', '-t', 'tree', '-w', '--stdin'], { input: '', stdio: ['pipe', 'pipe', 'pipe'] });
  const commit = git([
    '-c',
    'user.name=gate-correctness',
    '-c',
    'user.email=gate-correctness@example.invalid',
    'commit-tree',
    emptyTree,
    '-p',
    'HEAD',
    '-m',
    'gate-correctness probe',
  ]);
  const ok = await prePush(`refs/heads/other ${commit} refs/heads/other ${ZERO_SHA}\n`);
  assert.equal(ok, false);
});

test('shared packages build in dependency order computed from package.json', () => {
  assert.deepEqual(sharedBuildOrder(fake), ['@claw/shared-types', '@claw/shared-constants', '@claw/shared-utilities']);
  const real = sharedBuildOrder(loadWorkspaces());
  const byName = new Map(loadWorkspaces().map((ws) => [ws.name, ws]));
  for (const [index, name] of real.entries()) {
    for (const dep of byName.get(name).internalDeps.filter((d) => real.includes(d) && d !== name)) {
      assert.ok(real.indexOf(dep) < index, `${dep} builds before ${name}`);
    }
  }
  assert.throws(
    () => sharedBuildOrder([{ ...fake[3], internalDeps: ['@claw/shared-constants'] }, fake[4]]),
    /cycle/u,
  );
});

test('a shared package whose dist was built from other source is stale', () => {
  // A synthetic package with its own dist, so the check never depends on the real
  // packages having been built (CI runs this suite on a fresh checkout).
  const name = '@claw/shared-stamp-probe';
  const dir = 'node_modules/.cache/claw-shared-build-probe/pkg';
  const stamp = repoPath('node_modules/.cache/claw-shared-build', `${name.replace('/', '__')}.hash`);
  const probe = [{ name, dir, type: 'shared-package', internalDeps: [] }];
  const hashes = new Map([[name, 'current-source-hash']]);
  mkdirSync(repoPath(dir, 'dist'), { recursive: true });
  writeFileSync(repoPath(dir, 'dist', 'index.js'), '');
  mkdirSync(dirname(stamp), { recursive: true });
  try {
    writeFileSync(stamp, 'built-from-older-source\n');
    assert.deepEqual(staleSharedPackages(probe, hashes), [name]);
    writeFileSync(stamp, 'current-source-hash\n');
    assert.deepEqual(staleSharedPackages(probe, hashes), []);
  } finally {
    rmSync(stamp, { force: true });
    rmSync(repoPath('node_modules/.cache/claw-shared-build-probe'), { force: true, recursive: true });
  }
});

test('a change to a shared dependency changes every dependent input hash', () => {
  const workspaces = loadWorkspaces();
  const order = sharedBuildOrder(workspaces);
  const hashes = sharedInputHashes(workspaces);
  assert.equal(new Set(order.map((name) => hashes.get(name))).size, order.length);
});

test('a lockfile-only change runs a lockfile consistency check locally', () => {
  const { tasks } = planRootChecks(['package-lock.json'], fake);
  assert.deepEqual(tasks.map((t) => t.name), ['lockfile-consistency']);
  assert.ok(tasks[0].args.includes('--dry-run'));
});

test('an ESLint config change runs architecture:check and lints real files', () => {
  const onlyConfig = planRootChecks(['eslint.config.mjs'], fake);
  assert.deepEqual(onlyConfig.tasks.map((t) => t.name), ['architecture-check', 'eslint-config-loads']);
  assert.ok(onlyConfig.tasks[1].args.includes(ESLINT_CANARY));
  assert.ok(existsSync(repoPath(ESLINT_CANARY)));

  const withSource = planRootChecks(['.lintstagedrc.cjs', 'apps/claw-chat-service/src/a.ts'], fake);
  assert.ok(withSource.tasks[1].args.includes('apps/claw-chat-service/src/a.ts'));
  assert.ok(withSource.tasks[1].args.includes('--max-warnings'));
});

test('tooling tests run only at pre-push, only for tooling changes, and never the rehearsal', () => {
  assert.equal(planRootChecks(['tools/affected/index.mjs'], fake).tasks.length, 0);
  const prePushPlan = planRootChecks(['tools/affected/index.mjs'], fake, { includeTooling: true });
  assert.deepEqual(prePushPlan.tasks.map((t) => t.name), ['tooling-tests']);
  const pkg = JSON.parse(readFileSync(repoPath('package.json'), 'utf8'));
  assert.match(pkg.scripts['knowledge:test:fast'], /--test-skip-pattern=\\?"\^end-to-end rehearsal:/u);
  assert.equal(planRootChecks(['apps/claw-chat-service/src/a.ts'], fake, { includeTooling: true }).tasks.length, 0);
});

test('a workspace with source and no spec fails verification', () => {
  const errors = checkEveryWorkspaceHasTests(
    [{ dir: 'packages/shared-rabbitmq', name: '@claw/shared-rabbitmq' }],
    { '@claw/shared-rabbitmq': { testFiles: 0 } },
  );
  assert.equal(errors.length, 1);
  assert.match(errors[0], /empty test suite/u);
  assert.deepEqual(checkEveryWorkspaceHasTests(), [], 'the real repo has no empty suite');
});

test('no workspace test script tolerates an empty suite', () => {
  for (const ws of loadWorkspaces()) {
    const pkg = JSON.parse(readFileSync(repoPath(ws.dir, 'package.json'), 'utf8'));
    assert.doesNotMatch(pkg.scripts.test ?? '', /passWithNoTests/u, ws.name);
  }
});

test('documentation inside a workspace triggers no code gate', () => {
  const result = computeAffectedFromFiles(
    ['apps/claw-chat-service/README.md', 'apps/claw-chat-service/CLAUDE.md', 'docs/x.md', 'rules/23-x.md'],
    fake,
  );
  assert.deepEqual(result.affected, []);
  assert.equal(result.rootInvariant, false);
});

test('pre-push tests the change: related specs for source edits, the suite otherwise', () => {
  const sourceOnly = computeAffectedFromFiles(['apps/claw-chat-service/src/a.ts'], fake);
  const entry = sourceOnly.affected[0];
  assert.deepEqual(testInvocation(entry, fake[0]), { script: 'test:related', args: ['src/a.ts'] });

  const config = computeAffectedFromFiles(['apps/claw-chat-service/vitest.config.ts'], fake);
  assert.deepEqual(testInvocation(config.affected[0], fake[0]), { script: 'test', args: [] });
});

test('a shared change tests only the package locally; dependents are typechecked', () => {
  const result = computeAffectedFromFiles(['packages/shared-utilities/src/x.ts'], fake);
  assert.deepEqual(planGate('test', result, fake, { related: true }).scope, ['@claw/shared-utilities']);
  assert.deepEqual(planGate('build', result, fake).scope, ['@claw/shared-utilities']);
  assert.deepEqual(planGate('typecheck', result, fake, { kinds: ['dependent'] }).scope, ['claw-chat-service']);
  assert.deepEqual(planGate('typecheck', result, fake).scope, ['@claw/shared-utilities', 'claw-chat-service']);
});

test('a shared package never builds in the same pool as its dependents', () => {
  const result = computeAffectedFromFiles(['packages/shared-utilities/package.json', 'apps/claw-chat-service/src/a.ts'], fake);
  const { scope, tasks } = planGate('build', result, fake);
  assert.deepEqual(scope, ['@claw/shared-utilities', 'claw-chat-service']);
  const { pooled, builtInOrder } = poolableTasks('build', tasks, scope, fake);
  assert.deepEqual(builtInOrder, ['@claw/shared-utilities']);
  assert.deepEqual(pooled.map((t) => t.name), ['claw-chat-service']);
  assert.equal(poolableTasks('test', tasks, scope, fake).pooled.length, 2, 'only builds write dist');
});

test('test suites never oversubscribe the gate budget', () => {
  assert.deepEqual(testConcurrency(14), { suites: 3, workersPerSuite: 4 });
  assert.deepEqual(testConcurrency(1), { suites: 1, workersPerSuite: 1 });
  assert.deepEqual(testConcurrency(4), { suites: 1, workersPerSuite: 4 });
  for (const jobs of [1, 2, 3, 4, 7, 14, 32]) {
    const { suites, workersPerSuite } = testConcurrency(jobs);
    assert.ok(suites * workersPerSuite <= Math.max(1, jobs), `${jobs} jobs`);
  }
  const result = computeAffectedFromFiles(['apps/claw-chat-service/src/a.ts'], fake);
  const [task] = planGate('test', result, fake, { related: true, testWorkers: 4 }).tasks;
  assert.ok(task.args.includes('--maxWorkers=4'));
  assert.ok(task.args.includes('src/a.ts'));
});

test('the gate pool uses half the cores unless CLAW_GATE_JOBS overrides it', () => {
  assert.equal(gateJobs({}, 2), 1);
  assert.equal(gateJobs({}, 28), 14);
  assert.equal(gateJobs({}, 1), 1);
  assert.equal(gateJobs({ CLAW_GATE_JOBS: '3' }, 28), 3);
  assert.equal(gateJobs({ CLAW_GATE_JOBS: 'zero' }, 8), 4);
});
