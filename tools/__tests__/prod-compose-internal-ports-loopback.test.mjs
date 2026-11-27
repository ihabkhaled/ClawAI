import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

import { parse } from 'yaml';

import { repoPath } from '../lib/repo.mjs';

// Security incident 2026-11-27 (rules/68): every Postgres, Redis (no password), MongoDB, RabbitMQ, ClamAV and the
// frontend were reachable from the internet, because Docker publishes on 0.0.0.0 and bypasses the host firewall.
// An attacker abused the open Redis. In production only nginx's 80 and 443 face the internet; every other published
// port binds to loopback (services reach each other by name on claw-network; the host mapping is for a local tool).
const PROD_COMPOSE = [
  'docker/docker-compose.prod.databases.yml',
  'docker/docker-compose.prod.services.yml',
  'docker/docker-compose.prod.ollama.yml',
];
const PUBLIC_PORTS = new Set(['80:80', '443:443']);
const LOOPBACK_PREFIXES = ['127.0.0.1:', '[::1]:'];

/** True when a short- or long-syntax port entry binds only to loopback, or is one of the public edge ports. */
function isAllowedPort(entry) {
  if (typeof entry === 'string' || typeof entry === 'number') {
    const value = String(entry);
    return PUBLIC_PORTS.has(value) || LOOPBACK_PREFIXES.some((prefix) => value.startsWith(prefix));
  }
  if (entry === null || typeof entry !== 'object') return false;
  if (['127.0.0.1', '::1'].includes(entry.host_ip)) return true;
  return PUBLIC_PORTS.has(`${String(entry.published)}:${String(entry.target)}`);
}

test('isAllowedPort accepts loopback and the edge ports, rejects every-interface ones', () => {
  assert.equal(isAllowedPort('127.0.0.1:${REDIS_PORT:-6380}:6379'), true);
  assert.equal(isAllowedPort('[::1]:5441:5432'), true);
  assert.equal(isAllowedPort('443:443'), true);
  assert.equal(isAllowedPort({ host_ip: '127.0.0.1', target: 5432, published: 5441 }), true);
  assert.equal(isAllowedPort('${REDIS_PORT:-6380}:6379'), false);
  assert.equal(isAllowedPort('0.0.0.0:5441:5432'), false);
  assert.equal(isAllowedPort('4000:80'), false);
  assert.equal(isAllowedPort({ target: 6379, published: 6380 }), false);
});

for (const relative of PROD_COMPOSE) {
  const compose = parse(fs.readFileSync(repoPath(relative), 'utf8'));
  const services = Object.entries(compose.services ?? {});

  test(`${relative} publishes nothing but 80/443 beyond loopback`, () => {
    const exposed = services.flatMap(([name, service]) =>
      (service.ports ?? []).filter((entry) => !isAllowedPort(entry)).map((entry) => `${name}: ${JSON.stringify(entry)}`),
    );
    assert.deepEqual(exposed, [], `ports reachable from the internet:\n${exposed.join('\n')}`);
  });
}

test('the production Redis requires the password from REDIS_PASSWORD', () => {
  const compose = parse(fs.readFileSync(repoPath('docker/docker-compose.prod.databases.yml'), 'utf8'));
  const redis = compose.services.redis;
  assert.deepEqual(redis.command, ['redis-server', '--requirepass', '${REDIS_PASSWORD:-}']);
});
