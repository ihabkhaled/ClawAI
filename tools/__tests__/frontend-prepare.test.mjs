import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { test } from 'node:test';

import { repoPath } from '../lib/repo.mjs';

function runLifecycle(script, workspace) {
  const isWindows = process.platform === 'win32';
  const executable = isWindows ? process.env.ComSpec : 'npm';
  assert.ok(executable, 'ComSpec must be available on Windows');
  const workspaceArgument = workspace ? ` --workspace=${workspace}` : '';
  const arguments_ = isWindows
    ? ['/d', '/s', '/c', `npm run ${script}${workspaceArgument}`]
    : ['run', script, ...(workspace ? [`--workspace=${workspace}`] : [])];
  return spawnSync(executable, arguments_, {
    cwd: repoPath(),
    encoding: 'utf8',
    env: {
      ...process.env,
      CI: 'true',
    },
  });
}

function assertLifecycleSucceeds(script, workspace) {
  const result = runLifecycle(script, workspace);
  assert.equal(result.status, 0, result.error?.message ?? result.stdout + result.stderr);
}

test('repository prepare lifecycle succeeds on the current platform', () => {
  assertLifecycleSucceeds('prepare');
});

test('frontend cache cleanup succeeds on the current platform', () => {
  assertLifecycleSucceeds('clear-cache', 'claw-frontend');
});

test('Tailwind config is explicitly loaded as an ES module', () => {
  const globals = readFileSync(repoPath('apps/claw-frontend/src/app/globals.css'), 'utf8');

  assert.match(globals, /@config '\.\.\/\.\.\/tailwind\.config\.mts';/);
  assert.equal(existsSync(repoPath('apps/claw-frontend/tailwind.config.mts')), true);
  assert.equal(existsSync(repoPath('apps/claw-frontend/tailwind.config.ts')), false);
});
