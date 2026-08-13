import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

import { repoPath } from '../lib/repo.mjs';

const workflow = readFileSync(repoPath('.github/workflows/deploy-production.yml'), 'utf8');

test('tracked Dockerfiles contain real instructions, not escaped newline text', () => {
  const dockerfiles = execFileSync('git', ['ls-files', 'apps/**/Dockerfile*'], {
    cwd: repoPath('.'),
    encoding: 'utf8',
  })
    .trim()
    .split(/\r?\n/u)
    .filter(Boolean);

  assert.ok(dockerfiles.length > 0, 'expected tracked application Dockerfiles');
  for (const dockerfile of dockerfiles) {
    const contents = readFileSync(repoPath(dockerfile), 'utf8');
    assert.doesNotMatch(contents, /\\n(?:COPY|RUN|FROM|WORKDIR|CMD|ENTRYPOINT)\b/u, dockerfile);
  }
});

test('deploy-production is reusable and manual, not triggered by normal CI completion', () => {
  assert.match(workflow, /on:\s*\n\s*workflow_call:\s*\n\s*inputs:\s*\n\s*target_sha:/u);
  assert.doesNotMatch(workflow, /workflow_run:/u);
});

test('deploy-production also supports manual exact-SHA deployment with the dispatch ref as default', () => {
  assert.match(workflow, /workflow_dispatch:\s*\n\s*inputs:\s*\n\s*target_sha:/u);
  assert.match(workflow, /target_sha:[\s\S]*?required:\s*false/u);
  assert.match(workflow, /inputs\.target_sha \|\| github\.sha/u);
  assert.match(workflow, /Target production SHA: \$TARGET_SHA/u);
});

test('deploy-production deploys the exact caller or manual SHA, not an unpinned main checkout', () => {
  assert.match(workflow, /TARGET_SHA:[^\n]*inputs\.target_sha/u);
  assert.match(workflow, /deploy-prod\.sh '\$TARGET_SHA'/u);
  // Never a plain `git pull` or an unpinned `main` checkout on the server side.
  assert.doesNotMatch(workflow, /git pull(?!\S)/u);
});

test('deploy-production validates a manual target before interpolating it into SSH', () => {
  const validation = workflow.indexOf('^[0-9a-fA-F]{40}$');
  const ssh = workflow.indexOf('ssh -i ~/.ssh/deploy_key');
  assert.ok(validation >= 0, 'missing exact SHA validation');
  assert.ok(validation < ssh, 'target must be validated before SSH interpolation');
});

test('deploy-production declares the production environment', () => {
  assert.match(workflow, /environment:\s*production/u);
});

test('deploy-production reads exactly the five documented secrets', () => {
  for (const secret of [
    'PROD_HOST',
    'PROD_USER',
    'PROD_PORT',
    'PROD_SSH_PRIVATE_KEY',
    'PROD_SSH_KNOWN_HOSTS',
  ]) {
    assert.match(workflow, new RegExp(`secrets\\.${secret}\\b`, 'u'), `missing secrets.${secret}`);
  }
});

test('deploy-production never disables host key checking', () => {
  assert.doesNotMatch(workflow, /StrictHostKeyChecking=no/u);
  assert.match(workflow, /UserKnownHostsFile=~\/\.ssh\/known_hosts/u);
});

test('deploy-production retries only SSH connectivity failures with bounded backoff', () => {
  assert.match(workflow, /ConnectTimeout=20/u);
  assert.match(workflow, /retry_delays=\(10 20 40 60 90\)/u);
  assert.match(workflow, /for attempt in 1 2 3 4 5 6/u);
  assert.match(workflow, /ssh_status" -ne 255/u);
  assert.match(workflow, /CLAW_SSH_CONNECTED/u);
  assert.match(workflow, /grep -q 'CLAW_SSH_CONNECTED' "\$ssh_output"/u);
  assert.match(
    workflow,
    /Connection timed out\|Connection refused\|No route to host\|Could not resolve hostname/u,
  );
  assert.match(workflow, /deploy_status="\$ssh_status"/u);
  assert.match(workflow, /exit "\$deploy_status"/u);
  assert.doesNotMatch(workflow, /deploy-prod\.sh[^\n]*\|\|\s*true/u);
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

test('deploy-production propagates the workflow URL and captures safe status on every outcome', () => {
  assert.match(workflow, /CLAW_DEPLOY_WORKFLOW_URL=/u);
  assert.match(workflow, /github\.server_url.*github\.repository.*github\.run_id/u);
  assert.match(workflow, /cat \.deploy\/status\.json/u);
  assert.match(workflow, /deployment-status\.json/u);
});

test('deploy-production always publishes a concise GitHub job summary', () => {
  const summary = workflow.split('Publish deployment summary')[1] ?? '';
  assert.match(summary.split('run:')[0], /if:\s*always\(\)/u);
  assert.match(summary, /GITHUB_STEP_SUMMARY/u);
  assert.match(summary, /Deployment status/u);
  assert.match(summary, /Production URL/u);
  assert.doesNotMatch(summary, /SSH_PRIVATE_KEY|CONTACT_SMTP_PASS|INTER_SERVICE_AUTH_TOKEN/u);
});
