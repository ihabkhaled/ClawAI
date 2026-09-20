import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import test from 'node:test';

import {
  computeAffectedFromFiles,
  createCiMatrix,
  createCiTestMatrix,
  TEST_SHARDS,
} from '../affected/index.mjs';
import { buildManifests } from '../lib/manifests.mjs';
import { repoPath } from '../lib/repo.mjs';

const workspaces = [
  {
    dir: 'apps/claw-payment-service',
    internalDeps: ['@claw/shared-auth'],
    name: 'claw-payment-service',
    scripts: ['lint', 'typecheck', 'test', 'build'],
    type: 'nestjs-service',
  },
  {
    dir: 'apps/claw-auth-service',
    internalDeps: ['@claw/shared-types'],
    name: 'claw-auth-service',
    scripts: ['lint', 'typecheck', 'test', 'build', 'prisma:generate'],
    type: 'nestjs-service',
  },
  {
    dir: 'apps/claw-frontend',
    internalDeps: ['@claw/shared-types'],
    name: 'claw-frontend',
    scripts: ['lint', 'typecheck', 'test', 'build'],
    type: 'frontend',
  },
  {
    dir: 'packages/shared-auth',
    internalDeps: ['@claw/shared-types'],
    name: '@claw/shared-auth',
    scripts: ['lint', 'typecheck', 'test', 'build'],
    type: 'shared-package',
  },
  {
    dir: 'packages/shared-types',
    internalDeps: [],
    name: '@claw/shared-types',
    scripts: ['lint', 'typecheck', 'test', 'build'],
    type: 'shared-package',
  },
];

const names = (result) => result.affected.map(({ name }) => name);

test('direct edits affect only their workspace', () => {
  const result = computeAffectedFromFiles(['apps/claw-payment-service/src/payment.ts'], workspaces);
  assert.deepEqual(names(result), ['claw-payment-service']);
});

test('shared package edits fan out transitively to every consumer', () => {
  const result = computeAffectedFromFiles(['packages/shared-types/src/index.ts'], workspaces);
  assert.deepEqual(names(result), [
    '@claw/shared-auth',
    '@claw/shared-types',
    'claw-auth-service',
    'claw-frontend',
    'claw-payment-service',
  ]);
});

test('global changes expand to the full workspace set', () => {
  const result = computeAffectedFromFiles(['package-lock.json'], workspaces);
  assert.equal(result.rootInvariant, true);
  assert.deepEqual(
    createCiMatrix(result, workspaces, true).include.map(({ workspace }) => workspace),
    workspaces.map(({ name }) => name),
  );
});

test('docs-only changes produce an empty successful matrix', () => {
  const result = computeAffectedFromFiles(['docs/README.md'], workspaces);
  assert.equal(result.rootInvariant, false);
  assert.deepEqual(createCiMatrix(result, workspaces), { include: [] });
});

test('matrix metadata is derived from workspace manifests', () => {
  const result = computeAffectedFromFiles(['apps/claw-auth-service/src/auth.ts'], workspaces);
  assert.deepEqual(createCiMatrix(result, workspaces), {
    include: [{ prisma: true, service: 'auth', workspace: 'claw-auth-service' }],
  });
});

// The frontend's ~3,600 tests were the longest job in CI; vitest --shard
// splits them. Only the test job shards — lint, typecheck and build stay one
// job per workspace, because this account runs 20 jobs at once at most.
test('the test matrix shards the workspaces that need it, and only those', () => {
  const result = computeAffectedFromFiles(['package-lock.json'], workspaces);
  const testMatrix = createCiTestMatrix(result, workspaces, true).include;
  const plain = createCiMatrix(result, workspaces, true).include;

  for (const [workspace, shards] of Object.entries(TEST_SHARDS)) {
    const entries = testMatrix.filter((entry) => entry.workspace === workspace);
    assert.equal(entries.length, shards, `${workspace} runs in ${String(shards)} jobs`);
    // Every shard index exactly once: a test file cannot fall out of all of them.
    assert.deepEqual(
      entries.map((entry) => entry.shard).sort((a, b) => a - b),
      Array.from({ length: shards }, (_, index) => index + 1),
    );
    assert.ok(entries.every((entry) => entry.shards === shards));
    assert.deepEqual(
      entries.map((entry) => entry.service),
      Array.from(
        { length: shards },
        (_, index) =>
          `${plain.find((e) => e.workspace === workspace).service} ${String(index + 1)}/${String(shards)}`,
      ),
    );
  }

  for (const entry of testMatrix.filter((e) => !(e.workspace in TEST_SHARDS))) {
    assert.deepEqual([entry.shard, entry.shards], [1, 1], `${entry.workspace} is one job`);
  }

  // Every workspace is still tested, and the other jobs are untouched.
  assert.deepEqual(
    [...new Set(testMatrix.map((entry) => entry.workspace))].sort(),
    plain.map((entry) => entry.workspace).sort(),
  );
});

test('a sharded workspace declares vitest, which is what --shard needs', () => {
  for (const workspace of Object.keys(TEST_SHARDS)) {
    const manifest = workspaces.find(({ name }) => name === workspace);
    assert.ok(manifest, `${workspace} exists`);
    assert.match(
      JSON.parse(readFileSync(repoPath(manifest.dir, 'package.json'), 'utf8')).scripts.test,
      /vitest/u,
      `${workspace} runs vitest`,
    );
  }
});

test('every Prisma workspace exposes the generation script used by CI', () => {
  const prismaWorkspaces = buildManifests().workspaces.workspaces.filter(({ dir }) =>
    existsSync(repoPath(dir, 'prisma/schema.prisma')),
  );

  for (const workspace of prismaWorkspaces) {
    assert.ok(workspace.scripts.includes('prisma:generate'), workspace.name);
  }
});

test('two direct service edits select exactly those services', () => {
  const result = computeAffectedFromFiles(
    ['apps/claw-payment-service/src/payment.ts', 'apps/claw-frontend/src/page.tsx'],
    workspaces,
  );
  assert.deepEqual(names(result), ['claw-frontend', 'claw-payment-service']);
});

test('shared-auth selects itself and its consumer without unrelated workspaces', () => {
  const result = computeAffectedFromFiles(['packages/shared-auth/src/index.ts'], workspaces);
  assert.deepEqual(names(result), ['@claw/shared-auth', 'claw-payment-service']);
});

for (const [label, file] of [
  ['CI workflow', '.github/workflows/ci.yml'],
  ['root package manifest', 'package.json'],
  ['root lockfile', 'package-lock.json'],
  ['shared TypeScript config', 'tsconfig.base.json'],
  ['root npm config', '.npmrc'],
  ['shared tool config', 'vitest.config.ts'],
]) {
  test(`${label} selects full CI`, () => {
    assert.equal(computeAffectedFromFiles([file], workspaces).rootInvariant, true);
  });
}

test('explicit safe fallback selects full CI when comparison is unavailable', () => {
  const result = { affected: [], changedFileCount: 0, rootInvariant: true };
  assert.equal(createCiMatrix(result, workspaces).include.length, workspaces.length);
});
