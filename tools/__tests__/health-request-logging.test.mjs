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

test('pino silences only successful health probes and preserves failed probes', () => {
  for (const service of SERVICES) {
    const source = readFileSync(
      repoPath('apps', `claw-${service}-service`, 'src', 'app', 'app.module.ts'),
      'utf8',
    );
    assert.match(
      source,
      /customLogLevel:[\s\S]{0,500}\/api\/v1\/health[\s\S]{0,500}statusCode < 400[\s\S]{0,500}return 'silent'/u,
      `${service}-service does not silence successful health probes`,
    );
    assert.match(source, /statusCode >= 500[\s\S]{0,200}return 'error'/u);
    assert.match(source, /statusCode >= 400[\s\S]{0,200}return 'warn'/u);
    assert.doesNotMatch(
      source,
      /autoLogging:\s*\{[^}]*\/api\/v1\/health/u,
      `${service}-service still hides failed health probes through autoLogging.ignore`,
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
