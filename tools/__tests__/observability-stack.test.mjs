import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';

import { parse } from 'yaml';

import { repoPath } from '../lib/repo.mjs';

// ADR-113. Prometheus is the first container here that is scraped rather than
// called: it holds operational history, it authenticates nobody, and it is
// declared in two compose files that drift the moment one is edited alone.
const COMPOSE = ['docker/docker-compose.dev.services.yml', 'docker/docker-compose.prod.services.yml'];
const METRICS_CONTAINERS = ['prometheus'];

const composeFile = (relative) => parse(fs.readFileSync(repoPath(relative), 'utf8'));

for (const relative of COMPOSE) {
  const compose = composeFile(relative);

  for (const name of METRICS_CONTAINERS) {
    test(`${relative} declares ${name}`, () => {
      assert.ok(compose.services[name], `${name} is missing from ${relative}`);
    });

    // It has no login of its own. Publishing a port would put the platform's
    // operational history on the host's network interface.
    test(`${relative} never publishes ${name}`, () => {
      assert.equal(
        compose.services[name].ports,
        undefined,
        `${name} must stay on the internal network`,
      );
    });

    test(`${relative} gives ${name} a named volume, so a recreate keeps its data`, () => {
      const volumes = compose.services[name].volumes ?? [];
      const named = volumes.filter((volume) => !volume.startsWith('.') && !volume.startsWith('/'));
      assert.ok(named.length >= 1, `${name} has no named volume`);
      for (const volume of named) {
        const declared = volume.split(':')[0];
        assert.ok(compose.volumes?.[declared] !== undefined, `${declared} is not declared`);
      }
    });
  }
}

test('both compose files describe the same metrics containers', () => {
  const [dev, prod] = COMPOSE.map(composeFile);
  for (const name of METRICS_CONTAINERS) {
    assert.equal(
      dev.services[name].image,
      prod.services[name].image,
      `${name} runs a different image in dev and prod`,
    );
    assert.deepEqual(
      dev.services[name].command,
      prod.services[name].command,
      `${name} is started differently in dev and prod`,
    );
  }
});

// The retention Prometheus is started with, and the TTL the log store uses,
// are the same 30 days on purpose: an incident is read across both (ADR-101,
// ADR-113). They live in different languages, so a test ties them together.
test('metrics are kept as long as logs', () => {
  const prod = composeFile('docker/docker-compose.prod.services.yml');
  const retention = (prod.services.prometheus.command ?? []).find((flag) =>
    flag.startsWith('--storage.tsdb.retention.time='),
  );
  assert.ok(retention, 'Prometheus must be started with an explicit retention');
  const days = Number(retention.split('=')[1].replace('d', ''));

  const schema = fs.readFileSync(
    repoPath('apps/claw-server-logs-service/src/modules/server-logs/schemas/server-log.schema.ts'),
    'utf8',
  );
  const ttlSeconds = Number(/expires:\s*([\d_]+)/u.exec(schema)?.[1].replaceAll('_', ''));
  assert.equal(days * 86_400, ttlSeconds, 'metrics retention and the log TTL have drifted apart');
});

// Config that only exists as a bind mount is invisible to the deployment plan
// unless it is mapped to its container (TD from 2026-09-20).
test('every metrics container maps its config directory in the deploy script', () => {
  const script = fs.readFileSync(repoPath('scripts/deploy-prod.sh'), 'utf8');
  const table = /CONFIG_DIR_SERVICES=\(([^)]*)\)/u.exec(script)?.[1] ?? '';
  for (const name of METRICS_CONTAINERS) {
    assert.match(table, new RegExp(`\\|${name}'`, 'u'), `${name} has no CONFIG_DIR_SERVICES row`);
  }
  const directory = /'([^']+)\|prometheus'/u.exec(table)?.[1];
  assert.ok(
    directory && fs.existsSync(repoPath(directory)),
    `the mapped directory ${String(directory)} must exist`,
  );
  assert.ok(fs.existsSync(repoPath(path.join(directory, 'prometheus.yml'))));
});
