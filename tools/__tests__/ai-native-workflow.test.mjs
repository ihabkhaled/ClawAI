import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

const workflow = readFileSync('.github/workflows/ai-native-os.yml', 'utf8');

test('tooling tests install dependencies required by imported tooling modules', () => {
  const toolingJob = workflow.split('  tooling-tests:')[1]?.split('  architecture-rules:')[0];

  assert.ok(toolingJob, 'tooling-tests job must exist');
  assert.match(toolingJob, /run: npm ci --ignore-scripts/);
  assert.ok(
    toolingJob.indexOf('npm ci --ignore-scripts') <
      toolingJob.indexOf('node --test "tools/__tests__/*.test.mjs"'),
    'dependencies must be installed before the tooling tests run',
  );
});
