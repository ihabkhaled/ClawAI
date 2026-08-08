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

function runCommands(source) {
  return [...source.matchAll(/^\s+run:\s+(.+)$/gmu)].map((match) => match[1].trim());
}

function assertChatPrismaGenerationPrecedes(commands, runtimeCommand) {
  const generateIndex = commands.findIndex(
    (command) =>
      command === 'npm run prisma:generate --workspace=claw-chat-service' ||
      command === 'cd apps/claw-chat-service && npx prisma generate',
  );
  const runtimeIndex = commands.indexOf(runtimeCommand);

  assert.notEqual(runtimeIndex, -1, `${runtimeCommand} must remain enforced`);
  assert.notEqual(
    generateIndex,
    -1,
    'the chat Prisma client must be generated from a clean checkout',
  );
  assert.ok(
    generateIndex < runtimeIndex,
    'Prisma generation must finish before Runtime V2 tests run',
  );
}

test('Runtime V2 CI jobs generate the chat Prisma client before compiling tests', () => {
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
    assertChatPrismaGenerationPrecedes(runCommands(jobSource(job.id)), job.command);
  }
});
