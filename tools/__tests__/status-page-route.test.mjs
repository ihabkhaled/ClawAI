import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

import { repoPath } from '../lib/repo.mjs';

// Observability plan B3: the status page's data is GET /api/v1/health/status,
// served by health-service and reached through nginx's existing health prefix.
// Nothing new is proxied, and Prometheus stays unpublished.

const locations = readFileSync(repoPath('infra/nginx/locations.conf'), 'utf8');
const controller = readFileSync(
  repoPath('apps/claw-health-service/src/modules/health/controllers/status-page.controller.ts'),
  'utf8',
);

/** Every `location` prefix nginx declares, in order. */
const prefixes = [...locations.matchAll(/^\s*location\s+(=\s+|~\*?\s+|\^~\s+)?(\S+)\s*\{/gmu)].map((match) => ({
  modifier: (match[1] ?? '').trim(),
  path: match[2],
}));

test('the health prefix proxies to health-service through a variable', () => {
  const block = locations.slice(locations.indexOf('location /api/v1/health {'));
  assert.match(block, /set \$health_backend https:\/\/health-service:4009;/u);
  assert.match(block, /proxy_pass \$health_backend;/u);
});

test('no more specific location steals /api/v1/health/status from health-service', () => {
  const path = '/api/v1/health/status';
  const competing = prefixes.filter(
    ({ modifier, path: prefix }) =>
      prefix !== '/api/v1/health' &&
      prefix !== '/' &&
      modifier !== '~' &&
      modifier !== '~*' &&
      (modifier === '=' ? prefix === path : path.startsWith(prefix)),
  );
  assert.deepEqual(competing, []);
});

test('the status controller is mounted under the health prefix and is admin-only', () => {
  assert.match(controller, /@Controller\('health\/status'\)/u);
  assert.match(controller, /@UseGuards\(AuthGuard, SessionRevocationGuard, RolesGuard\)/u);
  assert.match(controller, /@Roles\(UserRole\.ADMIN\)/u);
  assert.match(controller, /Cache-Control', STATUS_CACHE_CONTROL/u);
});

test('Prometheus is still not proxied: the browser reads history through health-service only', () => {
  assert.doesNotMatch(locations, /https?:\/\/prometheus[:/]/iu);
});
