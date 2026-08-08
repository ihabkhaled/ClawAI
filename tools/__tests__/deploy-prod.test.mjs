import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

import { repoPath } from '../lib/repo.mjs';

const script = readFileSync(repoPath('scripts/deploy-prod.sh'), 'utf8');

test('deploy-prod.sh is syntactically valid bash', () => {
  const result = spawnSync('bash', ['-n', repoPath('scripts/deploy-prod.sh')], { encoding: 'utf8' });
  assert.equal(result.status, 0, result.stderr);
});

test('deploy-prod.sh runs under a strict shell mode', () => {
  assert.match(script, /^set -Eeuo pipefail$/mu);
});

test('deploy-prod.sh never runs a destructive Docker or git operation', () => {
  // Read literally, not just "grep-absent": these strings must not appear
  // anywhere outside a comment that explicitly disclaims them (the file's own
  // "What this script will NEVER do" header quotes several of these on
  // purpose, so the assertion only looks at non-comment lines).
  const codeLines = script
    .split('\n')
    .filter((line) => !/^\s*#/u.test(line))
    .join('\n');

  assert.doesNotMatch(codeLines, /docker compose[^\n]*\bdown\b/u);
  assert.doesNotMatch(codeLines, /\bdocker rm\b/u);
  assert.doesNotMatch(codeLines, /\bdocker volume rm\b/u);
  assert.doesNotMatch(codeLines, /\bdocker system prune\b/u);
  assert.doesNotMatch(codeLines, /--remove-orphans/u);
  assert.doesNotMatch(codeLines, /\bgit clean\b/u);
  assert.doesNotMatch(codeLines, /\bgit reset --hard\b/u);
  assert.doesNotMatch(codeLines, /\bmigrate reset\b/u);
});

test('deploy-prod.sh never pulls with a plain `git pull`', () => {
  assert.doesNotMatch(script, /(?<!#[^\n]*)\bgit pull\b/u);
});

test('deploy-prod.sh never echoes or cats the .env file', () => {
  assert.doesNotMatch(script, /\b(?:cat|echo)\s+"?\$ENV_FILE"?/u);
});

test('deploy-prod.sh recreates containers with --no-deps so unrelated healthy services are left alone', () => {
  assert.match(script, /compose up -d --no-deps --no-build/u);
});

test('deploy-prod.sh writes the deployed SHA only via the atomic record_deployment helper', () => {
  const writesToStateFile = [...script.matchAll(/>\s*"?\$STATE_FILE"?(?!\.tmp)/gu)];
  assert.deepEqual(writesToStateFile, [], 'a direct, non-atomic write to $STATE_FILE was found');
  assert.match(script, /printf '%s\\n' "\$sha" >"\$STATE_FILE\.tmp"/u);
  assert.match(script, /mv -f "\$STATE_FILE\.tmp" "\$STATE_FILE"/u);
});

test('deploy-prod.sh only calls record_deployment after health has been verified for every service', () => {
  const body = script.split('main() {')[1] ?? '';
  const healthIndex = body.indexOf('wait_for_service_health');
  const recordIndex = body.lastIndexOf('record_deployment');
  assert.ok(healthIndex > -1 && recordIndex > -1);
  assert.ok(healthIndex < recordIndex, 'record_deployment appears before health verification in main()');
});

test('deploy-prod.sh validates the target argument as a hex commit SHA before doing anything else', () => {
  assert.match(script, /\*\[!0-9a-fA-F\]\* \| ''\)/u);
});

test('deploy-prod.sh refuses to deploy over tracked working-tree modifications', () => {
  assert.match(script, /git -C "\$PROJECT_ROOT" status --porcelain --untracked-files=no --ignore-submodules=all/u);
});

test('deploy-prod.sh guards against deploying an older commit without an explicit opt-in', () => {
  assert.match(script, /CLAW_DEPLOY_ALLOW_ROLLBACK/u);
  assert.match(script, /merge-base --is-ancestor "\$new_sha" "\$old_sha"/u);
});

test('deploy-prod.sh takes a deploy lock before touching the checkout', () => {
  assert.match(script, /acquire_lock/u);
  assert.match(script, /flock/u);
});

test('end-to-end rehearsal: first deploy, selective deploy, shared-package fan-out, no-op, rollback guard, build/health failure, locking', { timeout: 120_000 }, () => {
  const result = spawnSync('bash', [repoPath('tools/__tests__/deploy-prod-e2e.sh')], {
    encoding: 'utf8',
    cwd: repoPath(),
  });
  if (result.status !== 0) {
    process.stderr.write(result.stdout ?? '');
    process.stderr.write(result.stderr ?? '');
  }
  assert.equal(result.status, 0, 'deploy-prod-e2e.sh reported at least one failing assertion — see output above');
  assert.doesNotMatch(result.stdout ?? '', /FAIL/u);
});
