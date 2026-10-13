import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

import { repoPath } from '../lib/repo.mjs';

const workflow = readFileSync(repoPath('.github', 'workflows', 'ci.yml'), 'utf8');

function jobSource(jobId) {
  const marker = `  ${jobId}:`;
  const start = workflow.indexOf(marker);
  assert.notEqual(start, -1, `${jobId} job must exist`);

  const remaining = workflow.slice(start + marker.length);
  const nextJob = remaining.search(/^  [a-z][a-z0-9-]*:/mu);
  return nextJob === -1 ? remaining : remaining.slice(0, nextJob);
}

// Prisma clients and shared-package dist are produced once, by the setup job,
// and reach every other job through the build-outputs artifact that the
// prepare action downloads. A job that runs chat tests must therefore depend on
// setup and prepare before its test command.
test('the setup job generates every Prisma client and ships it to the matrix jobs', () => {
  const setup = jobSource('setup');
  const generate = setup.indexOf('npm run prisma:generate --workspaces --if-present');
  const upload = setup.indexOf('name: build-outputs');
  assert.ok(generate >= 0, 'setup must generate every Prisma client');
  assert.ok(upload > generate, 'the generated clients must be uploaded after generation');
  assert.match(setup, /apps\/\*\/src\/generated/u);
});

test('Runtime V2 CI jobs get the chat Prisma client before compiling tests', () => {
  const jobs = [
    {
      id: 'runtime-v2-coverage',
      command: 'npm run test:runtime-v2:coverage --workspace=claw-chat-service',
    },
    {
      id: 'runtime-v2-redis',
      command: 'npm run test:runtime-v2:redis --workspace=claw-chat-service',
    },
  ];

  for (const job of jobs) {
    const source = jobSource(job.id);
    assert.match(source, /needs: \[changes, setup\]/u, `${job.id} must wait for the setup job`);
    const prepared = source.indexOf('uses: ./.github/actions/prepare');
    const runtime = source.indexOf(job.command);
    assert.notEqual(runtime, -1, `${job.command} must remain enforced`);
    assert.ok(prepared >= 0 && prepared < runtime, 'build outputs must be downloaded before Runtime V2 tests run');
  }
});
