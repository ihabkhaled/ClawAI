import assert from 'node:assert/strict';
import test from 'node:test';

import { runPreflight } from '../release/preflight.mjs';
import { runWorkspaceGate } from '../release/workspace-gate.mjs';

const WORKSPACES = [
  { name: '@claw/shared-constants', pkg: { scripts: { lint: 'eslint src/' } } },
  { name: 'claw-auth-service', pkg: { scripts: { lint: 'eslint src/' } } },
  { name: 'claw-no-lint', pkg: { scripts: { test: 'jest' } } },
];

test('workspace release gate runs each matching workspace sequentially with labels', () => {
  const active = [];
  const completed = [];
  const output = [];

  runWorkspaceGate('lint', {
    workspaces: WORKSPACES,
    execute(name, script, scriptArguments) {
      assert.deepEqual(active, [], 'workspace gates overlapped');
      active.push(name);
      assert.equal(script, 'lint');
      assert.deepEqual(scriptArguments, ['--concurrency=1']);
      completed.push(name);
      active.pop();
    },
    write: (message) => output.push(message),
  });

  assert.deepEqual(completed, ['@claw/shared-constants', 'claw-auth-service']);
  assert.match(output.join(''), /\[lint 1\/2\] @claw\/shared-constants/u);
  assert.match(output.join(''), /\[lint 2\/2\] claw-auth-service/u);
});

test('workspace release gate fails fast and identifies the failed workspace', () => {
  const completed = [];

  assert.throws(
    () =>
      runWorkspaceGate('lint', {
        workspaces: WORKSPACES,
        execute(name) {
          completed.push(name);
          if (name === '@claw/shared-constants') throw new Error('heap exhausted');
        },
        write: () => {},
      }),
    /@claw\/shared-constants failed npm run lint/u,
  );
  assert.deepEqual(completed, ['@claw/shared-constants']);
});

test('release preflight delegates all four full gates to the sequential workspace runner', () => {
  const commands = [];
  const workspaceGates = [];

  runPreflight({
    args: [],
    runCommand: (command) => commands.push(command),
    runWorkspace: (script) => workspaceGates.push(script),
    write: () => {},
    writeError: () => {},
  });

  assert.deepEqual(workspaceGates, ['lint', 'typecheck', 'test', 'build']);
  assert.deepEqual(commands, [
    'node --version',
    'npm run audit:check',
    'npm run knowledge:check',
    'npm run knowledge:verify',
    'npm run knowledge:test',
    'npm run format:check',
  ]);
});
