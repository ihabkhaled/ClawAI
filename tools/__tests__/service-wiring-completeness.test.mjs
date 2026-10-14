import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { test } from 'node:test';

import { repoPath } from '../lib/repo.mjs';

// A new apps/claw-<name>-service must be wired into every place that enumerates
// services (rules/05, docs/11-runbooks/add-a-service-to-production.md). This test
// walks the workspaces, so a service added tomorrow is held to the same list
// without anyone remembering to extend a hand-written one.

const read = (path) => readFileSync(repoPath(path), 'utf8').replaceAll('\r\n', '\n');

const services = readdirSync(repoPath('apps'))
  .filter((dir) => /^claw-.+-service$/u.test(dir))
  .map((dir) => ({ dir, name: dir.replace(/^claw-/u, '') }));

const prodServices = read('docker/docker-compose.prod.services.yml');
const devServices = read('docker/docker-compose.dev.services.yml');
const prodDatabases = read('docker/docker-compose.prod.databases.yml');
const devDatabases = read('docker/docker-compose.dev.databases.yml');
const healthConstants = read(
  'apps/claw-health-service/src/modules/health/constants/health.constants.ts',
);
const statusConstants = read(
  'apps/claw-health-service/src/modules/health/constants/status-page.constants.ts',
);
const tlsBash = read('scripts/install-tls.sh');
const tlsPowerShell = read('scripts/install-tls.ps1');
const dependabot = read('.github/dependabot.yml');
const thresholds = JSON.parse(read('tools/coverage/thresholds.json'));
const devWatch = read('tools/__tests__/docker-dev-watch.test.mjs');

/**
 * chat-service is the only service that scales (ADR-077): it fixes no container_name and
 * publishes no host port, because Docker refuses both on a replicated service.
 */
const SCALED_SERVICES = new Set(['chat-service']);

/** health-service is the one that does the checking; it does not check itself. */
const NOT_IN_HEALTH_REGISTRY = new Set(['health-service']);

function serviceBlock(source, name) {
  const lines = source.split('\n');
  const start = lines.indexOf(`  ${name}:`);
  if (start === -1) return undefined;
  const rest = lines.slice(start + 1);
  const end = rest.findIndex((line) => /^ {2}\S[^:]*:$/u.test(line));
  return lines.slice(start, end === -1 ? lines.length : start + 1 + end).join('\n');
}

test('there are services to check (the walk found the workspaces)', () => {
  assert.ok(services.length >= 20, `only ${services.length} services found`);
  assert.ok(services.some((service) => service.name === 'plugin-service'));
});

for (const { dir, name } of services) {
  test(`${name} is wired into compose, health, TLS, Dependabot and coverage`, () => {
    for (const [label, source] of [
      ['docker-compose.prod.services.yml', prodServices],
      ['docker-compose.dev.services.yml', devServices],
    ]) {
      const block = serviceBlock(source, name);
      assert.ok(block, `${name} has no service in ${label}`);
      if (!SCALED_SERVICES.has(name)) {
        assert.match(
          block,
          new RegExp(`container_name: claw-${name}$`, 'mu'),
          `${label} container_name`,
        );
      }
      assert.match(block, /^ {4}restart: unless-stopped$/mu, `${label} restart`);
      assert.match(block, /^ {4}healthcheck:$/mu, `${label} healthcheck`);
      assert.match(block, /^ {4}logging: \*claw-logging$/mu, `${label} logging`);
      assert.match(block, /^ {6}- claw-network$/mu, `${label} network`);
      assert.match(block, /^ {4}env_file: \.\.\/\.env$/mu, `${label} env_file`);
      assert.match(block, new RegExp(`claw\\.service: ${name}$`, 'mu'), `${label} label`);
    }

    // Every database the service waits for exists in BOTH database compose files.
    const prodBlock = serviceBlock(prodServices, name) ?? '';
    for (const database of prodBlock.matchAll(/^ {6}(pg-[a-z0-9-]+):$/gmu)) {
      assert.ok(
        serviceBlock(prodDatabases, database[1]),
        `${database[1]} missing in prod databases`,
      );
      assert.ok(serviceBlock(devDatabases, database[1]), `${database[1]} missing in dev databases`);
      assert.ok(
        prodDatabases.includes(`  ${database[1]}-data:`),
        `${database[1]} has no volume in prod databases`,
      );
      assert.ok(
        devDatabases.includes(`  ${database[1]}-data:`),
        `${database[1]} has no volume in dev databases`,
      );
    }

    // The healthcheck, the published port and the health registry agree on the port.
    const probed = /https:\/\/localhost:(\d+)\/api\/v1\/health/u.exec(prodBlock);
    assert.ok(probed, `${name} healthcheck does not probe https://localhost:<port>/api/v1/health`);
    const port = probed[1];
    if (!SCALED_SERVICES.has(name)) {
      assert.ok(
        prodBlock.includes(`'127.0.0.1:${port}:${port}'`),
        `${name} must publish 127.0.0.1:${port}:${port} in prod`,
      );
    }
    if (!NOT_IN_HEALTH_REGISTRY.has(name)) {
      assert.match(
        healthConstants,
        new RegExp(`'${name}': 'https://${name}:${port}/api/v1/health'`, 'u'),
        `${name} is not in SERVICE_URLS with port ${port}`,
      );
      assert.ok(statusConstants.includes(`'${name}'`), `${name} is on no status-page component`);
    }

    assert.ok(tlsBash.includes(name), `${name} is not in install-tls.sh`);
    assert.ok(tlsPowerShell.includes(name), `${name} is not in install-tls.ps1`);
    assert.ok(dependabot.includes(`/apps/${dir}`), `${dir} is not in dependabot.yml`);
    assert.ok(devWatch.includes(`'${name}'`), `${name} is not in the docker-dev-watch list`);
    for (const [section, entries] of Object.entries(thresholds)) {
      if (typeof entries === 'object' && entries !== null && !Array.isArray(entries)) {
        const hasWorkspaces = Object.keys(entries).some((key) => key.startsWith('claw-'));
        if (hasWorkspaces) {
          assert.ok(dir in entries, `${dir} has no entry under "${section}" in thresholds.json`);
        }
      }
    }
  });
}
