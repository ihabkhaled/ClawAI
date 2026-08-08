import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

import { repoPath } from '../lib/repo.mjs';

const workflow = readFileSync(repoPath('.github/workflows/deploy-production.yml'), 'utf8');

test('deploy-production triggers only on CI workflow_run completion', () => {
  assert.match(workflow, /on:\s*\n\s*workflow_run:\s*\n\s*workflows:\s*\['CI'\]/u);
  assert.match(workflow, /types:\s*\[completed\]/u);
});

test('deploy-production gates on success, push event, and main branch — not PRs, not develop', () => {
  const condition = workflow.split('if: >')[1]?.split('steps:')[0] ?? '';
  assert.match(condition, /workflow_run\.conclusion == 'success'/u);
  assert.match(condition, /workflow_run\.event == 'push'/u);
  assert.match(condition, /workflow_run\.head_branch == 'main'/u);
});

test('deploy-production deploys the exact head_sha, not a fresh checkout of main', () => {
  assert.match(workflow, /TARGET_SHA:\s*\$\{\{\s*github\.event\.workflow_run\.head_sha\s*\}\}/u);
  assert.match(workflow, /deploy-prod\.sh '\$TARGET_SHA'/u);
  // Never a plain `git pull` or an unpinned `main` checkout on the server side.
  assert.doesNotMatch(workflow, /git pull(?!\S)/u);
});

test('deploy-production declares the production environment', () => {
  assert.match(workflow, /environment:\s*production/u);
});

test('deploy-production reads exactly the five documented secrets', () => {
  for (const secret of ['PROD_HOST', 'PROD_USER', 'PROD_PORT', 'PROD_SSH_PRIVATE_KEY', 'PROD_SSH_KNOWN_HOSTS']) {
    assert.match(workflow, new RegExp(`secrets\\.${secret}\\b`, 'u'), `missing secrets.${secret}`);
  }
});

test('deploy-production never disables host key checking', () => {
  assert.doesNotMatch(workflow, /StrictHostKeyChecking=no/u);
  assert.match(workflow, /UserKnownHostsFile=~\/\.ssh\/known_hosts/u);
});

test('deploy-production serializes on a single concurrency group without cancelling in-flight runs', () => {
  assert.match(workflow, /concurrency:\s*\n\s*group:\s*clawai-production/u);
  assert.match(workflow, /cancel-in-progress:\s*false/u);
});

test('deploy-production cleans up SSH key material even on failure', () => {
  const cleanup = workflow.split('Clean up SSH material')[1] ?? '';
  assert.match(cleanup.split('run:')[0], /if:\s*always\(\)/u);
  assert.match(cleanup, /rm -rf ~\/\.ssh\/deploy_key ~\/\.ssh\/known_hosts/u);
});

test('deploy-production never prints the private key or known_hosts content', () => {
  assert.doesNotMatch(workflow, /echo.*SSH_PRIVATE_KEY/u);
  assert.doesNotMatch(workflow, /cat.*deploy_key/u);
});
