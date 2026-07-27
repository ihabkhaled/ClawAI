import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

import { repoPath } from '../lib/repo.mjs';

const EXTENSION_PATH = 'apps/claw-coding-agent';

function readJson(path) {
  return JSON.parse(readFileSync(path, 'utf8'));
}

test('the standalone coding-agent submodule is not absorbed by npm workspaces', () => {
  const rootManifest = readJson(repoPath('package.json'));
  const lockfile = readJson(repoPath('package-lock.json'));
  const gitmodules = readFileSync(repoPath('.gitmodules'), 'utf8');

  assert.deepEqual(rootManifest.workspaces, [
    'packages/*',
    'apps/claw-*-service',
    'apps/claw-frontend',
  ]);
  assert.equal(
    Object.hasOwn(lockfile.packages, EXTENSION_PATH),
    false,
    'parent lockfile must not capture the independently locked extension',
  );
  assert.match(gitmodules, /path = apps\/claw-coding-agent/u);
  assert.match(gitmodules, /url = https:\/\/github\.com\/ihabkhaled\/ClawAI-Coding-Agent\.git/u);
});
