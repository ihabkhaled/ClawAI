import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { test } from 'node:test';

import { repoPath } from '../lib/repo.mjs';

function runFrontendLifecycle(script) {
  const isWindows = process.platform === 'win32';
  const executable = isWindows ? process.env.ComSpec : 'npm';
  assert.ok(executable, 'ComSpec must be available on Windows');
  const arguments_ = isWindows
    ? ['/d', '/s', '/c', `npm run ${script} --workspace=claw-frontend`]
    : ['run', script, '--workspace=claw-frontend'];
  return spawnSync(executable, arguments_, {
    cwd: repoPath(),
    encoding: 'utf8',
    env: {
      ...process.env,
      CI: 'true',
    },
  });
}

function assertLifecycleSucceeds(script) {
  const result = runFrontendLifecycle(script);
  assert.equal(result.status, 0, result.error?.message ?? result.stdout + result.stderr);
}

test('frontend prepare lifecycle succeeds on the current platform', () => {
  assertLifecycleSucceeds('prepare');
});

test('frontend cache cleanup succeeds on the current platform', () => {
  assertLifecycleSucceeds('clear-cache');
});
