#!/usr/bin/env node
// Affected-workspace engine. Given a git diff, determines which workspaces need
// validation and WHY — so a one-service change runs a one-service gate, not the
// whole fleet, while a shared-package change fans out to its dependents.
//
//   node tools/affected/index.mjs list [--base=<ref>] [--staged]
//   node tools/affected/index.mjs lint|typecheck|build [--base=<ref>] [--staged] [--all-on-root]
//   node tools/affected/index.mjs test [--base=<ref>] [--staged] [--all-on-root] [--related]
//   node tools/affected/index.mjs root-checks [--base=<ref>] [--staged] [--tooling]
//   node tools/affected/index.mjs shared-build
//   node tools/affected/index.mjs knowledge --record     (pre-commit step 2)
//   node tools/affected/index.mjs gates                  (npm run gates:receipt)
//   node tools/affected/index.mjs ci-matrix [--base=<ref> --head=<sha> | --full]
//
// Without --base the base is resolved explicitly (origin/HEAD → origin/main →
// main, fetching once if needed). A base that does not resolve is an error,
// never "0 changed files".
import { execFileSync } from 'node:child_process';
import { existsSync } from 'node:fs';

import { cmp } from '../lib/fact.mjs';
import { extractTests, extractWorkspaces } from '../lib/extractors.mjs';
import { assertCommit, git, gitLines, resolveDefaultBase } from '../lib/git.mjs';
import { npmInvocation } from '../lib/npm.mjs';
import { isMain, repoPath } from '../lib/repo.mjs';
import { listFragmentDocs } from '../knowledge/count-fragments.mjs';
import { recordReceipt } from '../gates/receipt.mjs';
import { formatSummary, gateJobs, runPool } from './pool.mjs';
import { planRootChecks } from './root-checks.mjs';
import { ensureSharedPackagesFresh, sharedBuildOrder } from './shared-build.mjs';

let workspaceCache = null;

/** Workspaces from package.json files, computed once per process. */
export function loadWorkspaces() {
  workspaceCache ??= extractWorkspaces();
  return workspaceCache;
}

/**
 * Changed files. In --staged mode (pre-commit) only the staged set counts, so a
 * commit validates what it commits and is not blocked by unrelated work in the
 * tree. With `head` it is exactly `base...head` (CI and pre-push of a ref).
 * Otherwise it is `base...HEAD` plus staged and unstaged edits.
 */
export function changedFiles(base, { staged = false, head } = {}) {
  if (staged) return [...new Set(gitLines(['diff', '--name-only', '--cached']))].sort();
  assertCommit(base);
  if (head) {
    assertCommit(head);
    return gitLines(['diff', '--name-only', `${base}...${head}`]).sort();
  }
  const parts = [
    ...gitLines(['diff', '--name-only', `${base}...HEAD`]),
    ...gitLines(['diff', '--name-only', '--cached']),
    ...gitLines(['diff', '--name-only']),
  ];
  return [...new Set(parts)].sort();
}

/** Reverse dependency map: package -> [workspaces depending on it]. */
function reverseDeps(workspaces) {
  const rev = {};
  for (const ws of workspaces) {
    for (const dep of ws.internalDeps) {
      rev[dep] = rev[dep] ?? [];
      rev[dep].push(ws.name);
    }
  }
  return rev;
}

const ROOT_INVARIANT =
  /^(package\.json|package-lock\.json|\.npmrc|\.lintstagedrc\.cjs|[^/]+\.config\.(?:js|mjs|cjs|ts)|eslint|tsconfig|\.github\/|\.husky\/|docker\/|infra\/|tools\/|scripts\/|rules\/|skills\/|context\/|\.env)/u;

/**
 * Markdown never feeds a compiler, a test or a bundle, so a documentation edit
 * inside a workspace (its README, CLAUDE.md or generated AGENTS.md) must not
 * trigger that workspace's code gates. Docs have their own checks.
 */
export function isDocumentation(file) {
  return file.endsWith('.md');
}

/**
 * Each affected workspace with WHY: `direct` (a file inside it changed; `files`
 * lists them) or `dependent` (it depends on a changed shared package).
 */
export function computeAffectedFromFiles(files, workspaces) {
  const rev = reverseDeps(workspaces);
  const affected = new Map();
  // A workspace that is both edited and a dependent counts as direct.
  const mark = (name, kind, reason) => {
    const entry = affected.get(name);
    if (!entry) affected.set(name, { kind, reason, files: [] });
    else if (kind === 'direct' && entry.kind !== 'direct') Object.assign(entry, { kind, reason });
    return affected.get(name);
  };

  let rootInvariant = false;
  for (const f of files) {
    if (isDocumentation(f)) continue;
    const owner = workspaces.find((ws) => f.startsWith(`${ws.dir}/`));
    if (owner) {
      mark(owner.name, 'direct', `direct edit: ${f}`).files.push(f);
      if (owner.type === 'shared-package') {
        const queue = [owner.name];
        const visited = new Set(queue);
        while (queue.length > 0) {
          const dependency = queue.shift();
          for (const dependent of rev[dependency] ?? []) {
            mark(dependent, 'dependent', `depends on changed package ${owner.name}`);
            if (!visited.has(dependent)) {
              visited.add(dependent);
              queue.push(dependent);
            }
          }
        }
      }
      continue;
    }
    if (ROOT_INVARIANT.test(f)) rootInvariant = true;
  }

  const result = [...affected.entries()]
    .map(([name, entry]) => ({
      name,
      kind: entry.kind,
      reason: entry.reason,
      files: [...new Set(entry.files)].sort(),
    }))
    .sort((a, b) => cmp(a.name, b.name));

  return { changedFileCount: files.length, rootInvariant, affected: result, files };
}

export function computeAffected(base, { staged = false, head } = {}) {
  const files = changedFiles(base, { staged, head });
  return { base, ...computeAffectedFromFiles(files, loadWorkspaces()) };
}

function serviceName(workspace) {
  if (workspace.name === 'claw-frontend') return 'frontend';
  if (workspace.name.startsWith('@claw/')) return workspace.name.slice('@claw/'.length);
  return workspace.name.replace(/^claw-/, '').replace(/-service$/, '');
}

/**
 * Workspaces whose test suite is split across parallel CI jobs.
 *
 * The frontend runs ~3,600 tests in one job, which made it the longest job in
 * CI at about four minutes while every other workspace finished in under one.
 * `vitest --shard=i/n` splits the files; each shard is a job of its own.
 *
 * Only the TEST matrix is sharded: the static (lint + typecheck) and build jobs
 * stay one per workspace, because this account runs at most 20 jobs at once.
 */
export const TEST_SHARDS = { 'claw-frontend': 4 };

/**
 * The matrix for the test job: one entry per workspace, except the workspaces
 * in TEST_SHARDS, which get one entry per shard.
 */
export function createCiTestMatrix(result, workspaces, full = false) {
  return {
    include: createCiMatrix(result, workspaces, full).include.flatMap((entry) => {
      const shards = TEST_SHARDS[entry.workspace] ?? 1;
      if (shards === 1) {
        return [{ ...entry, shard: 1, shards: 1 }];
      }
      return Array.from({ length: shards }, (_, index) => ({
        ...entry,
        service: `${entry.service} ${String(index + 1)}/${String(shards)}`,
        shard: index + 1,
        shards,
      }));
    }),
  };
}

export function createCiMatrix(result, workspaces, full = false) {
  const selected = new Set(
    full || result.rootInvariant
      ? workspaces.map(({ name }) => name)
      : result.affected.map(({ name }) => name),
  );
  return {
    include: workspaces
      .filter(({ name }) => selected.has(name))
      .map((workspace) => ({
        dir: workspace.dir,
        prisma: workspace.scripts.includes('prisma:generate'),
        service: serviceName(workspace),
        slug: serviceName(workspace),
        workspace: workspace.name,
      })),
  };
}

/**
 * The sharded workspaces whose blob reports are merged after the test job —
 * that merge is where their coverage thresholds are enforced, because no
 * single shard sees the whole suite.
 */
export function createCiMergeMatrix(result, workspaces, full = false) {
  return {
    include: createCiMatrix(result, workspaces, full)
      .include.filter((entry) => (TEST_SHARDS[entry.workspace] ?? 1) > 1)
      .map((entry) => ({ ...entry, shards: TEST_SHARDS[entry.workspace] })),
  };
}

const DEPLOY_PATHS =
  /^(?:scripts\/deploy|tools\/release\/|tools\/__tests__\/deploy-prod|docker\/|\.github\/workflows\/deploy-production\.yml$)/u;
const PRODUCTION_DOCKERFILE = /(?:^|\/)Dockerfile$/u;

/** True when the change can affect the production deploy (runs the deploy rehearsal in CI). */
export function touchesDeploy(files) {
  return files.some((file) => DEPLOY_PATHS.test(file));
}

/** Production Dockerfiles among the changed files (the CI image scan builds and scans each). */
export function changedDockerfiles(files) {
  return files
    .filter((file) => PRODUCTION_DOCKERFILE.test(file) && existsSync(repoPath(file)))
    .sort();
}

const SOURCE_FILE = /\/src\/.+\.(?:ts|tsx|mts|js|jsx)$/u;

/**
 * How a directly changed workspace is tested locally. When every changed file
 * is source under src/, `vitest related` runs only the specs that import them.
 * Any other change (vitest config, package.json, tsconfig, test setup) can
 * affect every spec, so the whole suite runs.
 */
export function testInvocation(entry, workspace) {
  const related =
    workspace.scripts.includes('test:related') &&
    entry.files.length > 0 &&
    entry.files.every((f) => SOURCE_FILE.test(f));
  if (!related) return { script: 'test', args: [] };
  return {
    script: 'test:related',
    args: entry.files.map((f) => f.slice(workspace.dir.length + 1)),
  };
}

function defaultKinds(script) {
  return script === 'typecheck' ? ['direct', 'dependent'] : ['direct'];
}

function npmTask(name, args) {
  const [command, commandArgs, options] = npmInvocation(args);
  return { name, command, args: commandArgs, options };
}

/**
 * The tasks for one gate. Locally (`expandRoot` false) the scope is:
 *  - typecheck: every affected workspace (direct and dependents)
 *  - test:      direct workspaces only, via `vitest related` where possible;
 *               dependents of a changed shared package are typechecked, and
 *               their full suites run in CI
 *  - build:     direct workspaces only (dependents build in CI)
 *  - lint:      direct workspaces
 * `kinds` narrows that (pre-push typechecks only dependents: the direct ones
 * are compiled by their build). With `expandRoot` and a root-invariant change,
 * every workspace runs in full.
 */
export function planGate(
  script,
  result,
  workspaces,
  {
    expandRoot = false,
    related = false,
    kinds = defaultKinds(script),
    testWorkers = testConcurrency().workersPerSuite,
  } = {},
) {
  const byName = new Map(workspaces.map((ws) => [ws.name, ws]));
  const has = (name, s) => byName.get(name)?.scripts.includes(s) ?? false;
  const all = result.rootInvariant && expandRoot;
  const entries = all
    ? workspaces.map((ws) => ({ name: ws.name, kind: 'direct', files: [] }))
    : result.affected.filter((entry) => kinds.includes(entry.kind));
  const scoped = entries.filter((entry) => has(entry.name, script));

  const tasks = scoped.map((entry) => {
    if (script !== 'test') return npmTask(entry.name, ['run', script, '--workspace', entry.name]);
    const invocation = related
      ? testInvocation(entry, byName.get(entry.name))
      : { script: 'test', args: [] };
    const label = `${entry.name}${invocation.script === 'test:related' ? ' (related)' : ''}`;
    return npmTask(label, [
      'run',
      invocation.script,
      '--workspace',
      entry.name,
      '--',
      `--maxWorkers=${String(testWorkers)}`,
      ...invocation.args,
    ]);
  });
  return { scope: scoped.map((entry) => entry.name), tasks };
}

/**
 * Every vitest run starts its own worker pool. Fourteen suites each sized for
 * the whole machine oversubscribed it so badly that frontend tests hit their
 * 20s timeouts (measured on the first push of this change). So the test gate
 * runs fewer suites at once and caps each suite's workers, keeping the total
 * at the gate budget: suites × workersPerSuite ≈ gateJobs().
 */
export function testConcurrency(jobs = gateJobs()) {
  const suites = Math.max(1, Math.floor(jobs / 4));
  return { suites, workersPerSuite: Math.max(1, Math.floor(jobs / suites)) };
}

const BUILDS_ON_SHARED = new Set(['typecheck', 'test', 'build']);

/** Biggest suites first, so the longest run starts at once instead of last. */
function largestSuitesFirst(tasks, scope) {
  const tests = extractTests();
  const size = (index) => tests[scope[index]]?.testFiles ?? 0;
  return tasks
    .map((task, index) => ({ task, files: size(index) }))
    .sort((a, b) => b.files - a.files)
    .map(({ task }) => task);
}

/**
 * The tasks that may run in the parallel pool. A shared package's build
 * rewrites the dist every dependent compiles against, so it never shares the
 * pool with them (measured: three service builds read a half-written
 * shared-utilities dist). ensureSharedPackagesFresh builds each stale shared
 * package in dependency order before the pool starts, and a fresh stamp means
 * an identical input already built successfully.
 */
export function poolableTasks(script, tasks, scope, workspaces) {
  if (script !== 'build') return { pooled: tasks, builtInOrder: [] };
  const shared = new Set(
    workspaces.filter((ws) => ws.type === 'shared-package').map((ws) => ws.name),
  );
  return {
    pooled: tasks.filter((_, index) => !shared.has(scope[index])),
    builtInOrder: scope.filter((name) => shared.has(name)),
  };
}

/** Run a gate's tasks in the bounded pool. Returns { ok, scope }. */
export async function runGate(script, result, options = {}) {
  const workspaces = loadWorkspaces();
  const { scope, tasks } = planGate(script, result, workspaces, options);
  const label =
    result.rootInvariant && options.expandRoot
      ? '(root invariant — ALL workspaces)'
      : scope.join(', ');
  console.log(`affected:${script} → ${label || '(none)'}`);
  if (tasks.length === 0) return { ok: true, scope };
  if (BUILDS_ON_SHARED.has(script)) ensureSharedPackagesFresh(workspaces);
  const { pooled, builtInOrder } = poolableTasks(script, tasks, scope, workspaces);
  if (builtInOrder.length > 0) {
    console.log(
      `affected:build → shared packages built in dependency order: ${builtInOrder.join(', ')}`,
    );
  }
  const results =
    script === 'test'
      ? await runPool(largestSuitesFirst(pooled, scope), { jobs: testConcurrency().suites })
      : await runPool(pooled);
  process.stdout.write(`\n${formatSummary(results)}`);
  return { ok: results.every((r) => r.ok), scope };
}

/** Run the root-invariant checks a change calls for. */
export async function runRootChecks(files, { tooling = false } = {}) {
  const { reasons, tasks } = planRootChecks(files, loadWorkspaces(), { includeTooling: tooling });
  for (const reason of reasons) console.log(`root-checks: ${reason}`);
  if (tasks.length === 0) {
    console.log('root-checks: none needed');
    return true;
  }
  const results = await runPool(tasks);
  process.stdout.write(`\n${formatSummary(results)}`);
  return results.every((r) => r.ok);
}

/** True when the working tree has no unstaged or untracked changes. */
function workingTreeMatchesIndex() {
  return (
    gitLines(['diff', '--name-only']).length === 0 &&
    gitLines(['ls-files', '--others', '--exclude-standard']).length === 0
  );
}

function runNode(script, args) {
  execFileSync(process.execPath, [script, ...args], { stdio: 'inherit' });
}

/**
 * Pre-commit step 2: regenerate the knowledge layer and inventory snapshot,
 * stage them, verify, and — when the working tree equals the index — record a
 * `knowledge` receipt for the exact tree being committed, so pre-push does not
 * verify the same tree again.
 */
function knowledgeStep(record) {
  runNode('tools/knowledge/build.mjs', ['--write-and-verify']);
  // Writing the snapshot computes exactly what `audit --check` would compare
  // against, so a check right after the write would prove nothing new.
  runNode('tools/audit/index.mjs', []);
  git(['add', '--', '.ai', 'docs/features/ai-native-engineering-os/inventory.snapshot.json']);
  const agents = gitLines([
    'ls-files',
    '--modified',
    '--others',
    '--exclude-standard',
    '--',
    '*/AGENTS.md',
    'AGENTS.md',
  ]);
  if (agents.length > 0) git(['add', '--', ...agents]);
  // Docs carrying `<!-- count:x -->` fragments are rewritten by the build too. Leaving them
  // unstaged is what made pre-push fail with "stale count fragment" (ADR-202).
  const fragmentDocs = new Set(listFragmentDocs());
  const refreshed = gitLines(['ls-files', '--modified', '--', '*.md']).filter((rel) =>
    fragmentDocs.has(rel),
  );
  if (refreshed.length > 0) {
    git(['add', '--', ...refreshed]);
    console.log(`knowledge: refreshed and staged count fragments in ${refreshed.length} doc(s)`);
  }
  if (!record) return;
  if (!workingTreeMatchesIndex()) {
    console.log('knowledge: working tree differs from the index — no receipt recorded');
    return;
  }
  recordReceipt(git(['write-tree']), 'knowledge', ['repo']);
}

/**
 * `npm run gates:receipt`: run every gate the hooks would run for the current
 * change, over a working tree identical to the index, and record a receipt
 * only for the gates that passed. There is no way to record without running.
 */
async function gatesAndRecord(base) {
  if (!workingTreeMatchesIndex()) {
    console.error(
      'gates:receipt refused — the working tree has unstaged or untracked changes, so the gates ' +
        'would not run over the tree being committed. Stage or stash them first.',
    );
    return false;
  }
  const tree = git(['write-tree']);
  const result = computeAffected(base);

  if (!(await runRootChecks(result.files, { tooling: true }))) return false;
  recordReceipt(tree, 'root', ['repo']);
  for (const [script, options] of [
    ['typecheck', {}],
    ['test', { related: true }],
    ['build', {}],
  ]) {
    const { ok, scope } = await runGate(script, result, options);
    if (!ok) return false;
    recordReceipt(tree, script, scope);
  }
  console.log(
    `gates:receipt recorded for tree ${tree.slice(0, 12)} (root, typecheck, test, build)`,
  );
  return true;
}

function flag(name) {
  const arg = process.argv.find((a) => a.startsWith(`--${name}=`));
  return arg ? arg.slice(name.length + 3) : undefined;
}

async function main() {
  const [command = 'list'] = process.argv.slice(2).filter((a) => !a.startsWith('--'));
  const has = (name) => process.argv.includes(`--${name}`);
  const staged = has('staged');
  const full = has('full');
  const head = flag('head');
  const base =
    staged || (command === 'ci-matrix' && full)
      ? flag('base')
      : (flag('base') ?? resolveDefaultBase());

  if (command === 'ci-matrix') {
    const workspaces = loadWorkspaces();
    const result = full
      ? { affected: [], changedFileCount: 0, rootInvariant: true, files: [] }
      : computeAffected(base, { head });
    const matrix = createCiMatrix(result, workspaces, full);
    const dockerfiles = full
      ? changedDockerfiles(gitLines(['ls-files']))
      : changedDockerfiles(result.files);
    process.stdout.write(
      JSON.stringify({
        deploy: full || touchesDeploy(result.files),
        dockerfiles,
        full: full || result.rootInvariant,
        hasAffected: matrix.include.length > 0,
        includesChat: matrix.include.some(({ workspace }) => workspace === 'claw-chat-service'),
        matrix,
        mergeMatrix: createCiMergeMatrix(result, workspaces, full),
        testMatrix: createCiTestMatrix(result, workspaces, full),
      }),
    );
    return true;
  }
  if (command === 'shared-build') {
    console.log(`shared build order: ${sharedBuildOrder(loadWorkspaces()).join(' → ')}`);
    ensureSharedPackagesFresh(loadWorkspaces());
    return true;
  }
  if (command === 'knowledge') {
    knowledgeStep(has('record'));
    return true;
  }
  if (command === 'gates') return gatesAndRecord(base);

  const result = computeAffected(base, { staged, head });
  if (command === 'list') {
    const where = staged ? 'staged changes' : base;
    console.log(
      `Affected vs ${where} (${result.changedFileCount} changed files)${result.rootInvariant ? ' [root invariant]' : ''}:`,
    );
    if (result.affected.length === 0 && !result.rootInvariant) console.log('  (none)');
    for (const a of result.affected) console.log(`  ${a.name} — ${a.reason}`);
    return true;
  }
  if (command === 'root-checks') return runRootChecks(result.files, { tooling: has('tooling') });
  const { ok } = await runGate(command, result, {
    expandRoot: has('all-on-root'),
    related: has('related'),
  });
  return ok;
}

if (isMain(import.meta.url)) {
  main().then(
    (ok) => process.exit(ok ? 0 : 1),
    (error) => {
      console.error(`✖ ${error.message}`);
      process.exit(1);
    },
  );
}
