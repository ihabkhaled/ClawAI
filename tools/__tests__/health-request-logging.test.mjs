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

// auth-service alone silences one extra routine route (its Grafana
// auth_request verify endpoint, ADR-115) through a shared `isRoutineRoute`
// helper instead of the inline `url === '/api/v1/health'` check every other
// service still has. The behavioural guarantee is the same — this checks
// both shapes rather than forcing a 17-service refactor onto a change that
// only auth-service needed.
const ROUTINE_ROUTE_HELPER_PATTERN = /isRoutineRoute\(req\.url\)[\s\S]{0,100}statusCode < 400/u;
const ROUTINE_ROUTE_INLINE_PATTERN =
  /\/api\/v1\/health[\s\S]{0,500}statusCode < 400|statusCode < 400[\s\S]{0,500}\/api\/v1\/health/u;

test('pino silences only successful health probes and preserves failed probes', () => {
  for (const service of SERVICES) {
    const source = readFileSync(
      repoPath('apps', `claw-${service}-service`, 'src', 'app', 'app.module.ts'),
      'utf8',
    );
    const usesHelper =
      ROUTINE_ROUTE_HELPER_PATTERN.test(source) &&
      /isRoutineRoute[\s\S]{0,200}return 'silent'/u.test(source);
    if (!usesHelper) {
      assert.match(
        source,
        /customLogLevel:[\s\S]{0,500}\/api\/v1\/health[\s\S]{0,500}statusCode < 400[\s\S]{0,500}return 'silent'/u,
        `${service}-service does not silence successful health probes`,
      );
    }
    assert.match(source, /statusCode >= 500[\s\S]{0,200}return 'error'/u);
    // auth-service writes this branch as a ternary (`return ... ? 'warn' :
    // 'info'`) rather than a separate `if` + `return 'warn'` — same outcome.
    assert.match(source, /statusCode >= 400[\s\S]{0,200}(return 'warn'|\? 'warn')/u);
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
    const usesHelper = /isRoutineRoute\(url\)[\s\S]{0,100}statusCode < 400/u.test(source);
    if (!usesHelper) {
      assert.match(source, /url\.split\('\?'\)\[0\] === '\/api\/v1\/health'/u);
      assert.match(source, /statusCode < 400/u);
    } else {
      // The helper itself must actually cover `/api/v1/health`, checked
      // against the routine-route constant it reads from.
      const constantsSource = readFileSync(
        repoPath(
          'apps',
          `claw-${service}-service`,
          'src',
          'common',
          'constants',
          'routine-routes.constants.ts',
        ),
        'utf8',
      );
      assert.match(constantsSource, /'\/api\/v1\/health'/u);
    }
  }
});
