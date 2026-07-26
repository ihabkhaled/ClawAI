import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { test } from 'node:test';

import { repoPath } from '../lib/repo.mjs';

test('frontend prepare lifecycle succeeds on the current platform', () => {
  const isWindows = process.platform === 'win32';
  const executable = isWindows ? process.env.ComSpec : 'npm';
  assert.ok(executable, 'ComSpec must be available on Windows');
  const arguments_ = isWindows
    ? ['/d', '/s', '/c', 'npm run prepare --workspace=claw-frontend']
    : ['run', 'prepare', '--workspace=claw-frontend'];
  const result = spawnSync(executable, arguments_, {
    cwd: repoPath(),
    encoding: 'utf8',
    env: {
      ...process.env,
      CI: 'true',
    },
  });

  assert.equal(result.status, 0, result.error?.message ?? result.stdout + result.stderr);
});
