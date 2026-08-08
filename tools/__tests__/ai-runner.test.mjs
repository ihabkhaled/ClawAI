import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';

import { runForAi } from '../ai/run.mjs';

test('AI runner compresses successful output and preserves the full log', () => {
  const logDirectory = mkdtempSync(join(tmpdir(), 'claw-ai-runner-'));
  const result = runForAi(process.execPath, ['-e', "process.stdout.write('line\\n'.repeat(200))"], {
    logDirectory,
  });

  assert.equal(result.exitCode, 0);
  assert.match(result.summary, /^PASS/u);
  assert.ok(result.summary.length < 200);
  assert.equal(readFileSync(result.logFile, 'utf8').split('line').length - 1, 200);
});

test('AI runner returns focused failure output and the original exit status', () => {
  const logDirectory = mkdtempSync(join(tmpdir(), 'claw-ai-runner-'));
  const result = runForAi(
    process.execPath,
    [
      '-e',
      "process.stdout.write('noise\\n'.repeat(200)); process.stderr.write('expected 409 received 500\\n'); process.exit(7)",
    ],
    { logDirectory, failureLines: 8 },
  );

  assert.equal(result.exitCode, 7);
  assert.match(result.summary, /^FAIL/u);
  assert.match(result.summary, /expected 409 received 500/u);
  assert.ok(result.summary.split('\n').length <= 12);
  assert.match(readFileSync(result.logFile, 'utf8'), /noise/u);
});
