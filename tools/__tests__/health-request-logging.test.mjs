import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

import { repoPath } from '../lib/repo.mjs';

const SERVICES = [
  'auth',
  'chat',
  'connector',
  'routing',
  'memory',
  'file',
  'audit',
  'ollama',
  'client-logs',
  'server-logs',
  'health',
  'image',
  'workspace',
  'agent',
  'research',
  'payment',
  'llamacpp',
  'file-generation',
];

test('routine health probes are excluded from verbose pino request logs', () => {
  for (const service of SERVICES) {
    const source = readFileSync(
      repoPath('apps', `claw-${service}-service`, 'src', 'app', 'app.module.ts'),
      'utf8',
    );
    assert.match(
      source,
      /autoLogging:[\s\S]{0,300}\/api\/v1\/health/u,
      `${service}-service does not exclude routine health probes from pino`,
    );
  }
});

test('routine successful health probes are not published as server log events', () => {
  for (const service of SERVICES.filter((name) => name !== 'health')) {
    const source = readFileSync(
      repoPath(
        'apps',
        `claw-${service}-service`,
        'src',
        'app',
        'interceptors',
        'logging.interceptor.ts',
      ),
      'utf8',
    );
    assert.match(source, /url\.split\('\?'\)\[0\] === '\/api\/v1\/health'/u);
    assert.match(source, /statusCode < 400/u);
  }
});
