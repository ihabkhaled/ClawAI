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
// IPv4 only (ADR-232): a bare '443:443' also publishes on [::], where Docker's proxy hides the client address.
const PUBLIC_PORTS = new Set(['0.0.0.0:80:80', '0.0.0.0:443:443']);
const LOOPBACK_PREFIXES = ['127.0.0.1:', '[::1]:'];

/** True when a short- or long-syntax port entry binds only to loopback, or is one of the public edge ports. */
function isAllowedPort(entry) {
  if (typeof entry === 'string' || typeof entry === 'number') {
    const value = String(entry);
    return PUBLIC_PORTS.has(value) || LOOPBACK_PREFIXES.some((prefix) => value.startsWith(prefix));
  }
  if (entry === null || typeof entry !== 'object') return false;
  if (['127.0.0.1', '::1'].includes(entry.host_ip)) return true;
  return (
    entry.host_ip === '0.0.0.0' &&
    PUBLIC_PORTS.has(`0.0.0.0:${String(entry.published)}:${String(entry.target)}`)
  );
}

test('isAllowedPort accepts loopback and the edge ports, rejects every-interface ones', () => {
  assert.equal(isAllowedPort('127.0.0.1:${REDIS_PORT:-6380}:6379'), true);
  assert.equal(isAllowedPort('[::1]:5441:5432'), true);
  assert.equal(isAllowedPort('0.0.0.0:443:443'), true);
  assert.equal(isAllowedPort('443:443'), false);
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
      (service.ports ?? [])
        .filter((entry) => !isAllowedPort(entry))
        .map((entry) => `${name}: ${JSON.stringify(entry)}`),
    );
    assert.deepEqual(exposed, [], `ports reachable from the internet:\n${exposed.join('\n')}`);
  });
}

test('the production Redis requires the password from REDIS_PASSWORD', () => {
  const compose = parse(
    fs.readFileSync(repoPath('docker/docker-compose.prod.databases.yml'), 'utf8'),
  );
  const redis = compose.services.redis;
  assert.equal(redis.command[0], 'redis-server');
  assert.equal(redis.command[1], '--requirepass');
  assert.match(redis.command[2], /^\$\{REDIS_PASSWORD:\?[^}]+\}$/u);
});

// 2026-11-27: 14 production databases shared one password and the compose files fell back to `claw_secret` when a
// value was missing. Every data-store password in a production compose file is now REQUIRED (`${VAR:?message}`):
// a missing value stops the deploy instead of starting a database on a well-known password. Values are unique per
// store (installers, scripts/rotate-db-passwords.sh).
const PASSWORD_KEYS = [
  'POSTGRES_PASSWORD',
  'MONGO_INITDB_ROOT_PASSWORD',
  'RABBITMQ_DEFAULT_PASS',
  'REDIS_PASSWORD',
];

/** A password value that may stand in a production compose file: a required variable, nothing else. */
function isRequiredVariable(value) {
  return typeof value === 'string' && /^\$\{[A-Z_]+:\?[^}]+\}$/u.test(value);
}

test('isRequiredVariable accepts only ${VAR:?message}', () => {
  assert.equal(isRequiredVariable('${PG_AUTH_PASSWORD:?PG_AUTH_PASSWORD is required}'), true);
  assert.equal(isRequiredVariable('${PG_AUTH_PASSWORD:-claw_secret}'), false);
  assert.equal(isRequiredVariable('${REDIS_PASSWORD:-}'), false);
  assert.equal(isRequiredVariable('${PG_AUTH_PASSWORD}'), false);
  assert.equal(isRequiredVariable('claw_secret'), false);
});

for (const relative of PROD_COMPOSE) {
  const compose = parse(fs.readFileSync(repoPath(relative), 'utf8'));
  test(`${relative} has no data-store password with a default`, () => {
    const weak = Object.entries(compose.services ?? {}).flatMap(([name, service]) => {
      // `environment` is a map or a list of KEY=value strings; read both.
      const environment = Array.isArray(service.environment)
        ? Object.fromEntries(
            service.environment.map((entry) => [
              entry.split('=')[0],
              entry.slice(entry.indexOf('=') + 1),
            ]),
          )
        : (service.environment ?? {});
      return PASSWORD_KEYS.filter(
        (key) => key in environment && !isRequiredVariable(environment[key]),
      ).map((key) => `${name}: ${key}=${JSON.stringify(environment[key])}`);
    });
    assert.deepEqual(weak, [], `passwords that can fall back to a default:\n${weak.join('\n')}`);
  });
}

// 2026-11-28: the Firecrawl sidecar's Redis answered PONG with no password and its RabbitMQ still had the default
// guest user, on claw-scrapers, the network shared with crawl4ai, flaresolverr and the headless browsers that load
// untrusted pages. Every store of the sidecar now has its own credential, from the environment (rules/68).
const FIRECRAWL_STORES = ['firecrawl-redis', 'firecrawl-rabbitmq', 'firecrawl-postgres'];
const DEV_COMPOSE = 'docker/docker-compose.dev.services.yml';
const PROD_SERVICES = 'docker/docker-compose.prod.services.yml';

/** The compose `environment` of a service as a plain object (map or KEY=value list). */
function environmentOf(service) {
  const environment = service.environment ?? {};
  if (!Array.isArray(environment)) return environment;
  return Object.fromEntries(
    environment.map((entry) => [entry.split('=')[0], entry.slice(entry.indexOf('=') + 1)]),
  );
}

test('the production Firecrawl Redis requires its own password and its healthcheck authenticates', () => {
  const compose = parse(fs.readFileSync(repoPath(PROD_SERVICES), 'utf8'));
  const redis = compose.services['firecrawl-redis'];
  assert.equal(redis.command[0], 'redis-server');
  const at = redis.command.indexOf('--requirepass');
  assert.ok(at > 0, 'firecrawl-redis has no --requirepass');
  assert.match(redis.command[at + 1], /^\$\{FIRECRAWL_REDIS_PASSWORD:\?[^}]+\}$/u);
  assert.match(environmentOf(redis).REDIS_PASSWORD, /^\$\{FIRECRAWL_REDIS_PASSWORD:\?[^}]+\}$/u);
  assert.match(
    JSON.stringify(redis.healthcheck.test),
    /redis-cli -a/u,
    'the healthcheck must authenticate',
  );
});

test('the production Firecrawl RabbitMQ has its own user and no guest', () => {
  const compose = parse(fs.readFileSync(repoPath(PROD_SERVICES), 'utf8'));
  const environment = environmentOf(compose.services['firecrawl-rabbitmq']);
  assert.equal(environment.RABBITMQ_DEFAULT_USER, 'firecrawl');
  assert.ok(isRequiredVariable(environment.RABBITMQ_DEFAULT_PASS));
  assert.match(environment.RABBITMQ_DEFAULT_PASS, /FIRECRAWL_RABBITMQ_PASSWORD/u);
});

test('the production Firecrawl API connects to every store with its credential', () => {
  const compose = parse(fs.readFileSync(repoPath(PROD_SERVICES), 'utf8'));
  const environment = environmentOf(compose.services['firecrawl-api']);
  assert.match(
    environment.REDIS_URL,
    /^redis:\/\/:\$\{FIRECRAWL_REDIS_PASSWORD:\?[^}]+\}@firecrawl-redis:6379$/u,
  );
  assert.equal(environment.REDIS_RATE_LIMIT_URL, environment.REDIS_URL);
  assert.match(
    environment.NUQ_RABBITMQ_URL,
    /^amqp:\/\/firecrawl:\$\{FIRECRAWL_RABBITMQ_PASSWORD:\?[^}]+\}@firecrawl-rabbitmq:5672$/u,
  );
  assert.ok(isRequiredVariable(environment.POSTGRES_PASSWORD));
});

for (const relative of [PROD_SERVICES, DEV_COMPOSE]) {
  test(`${relative}: no Firecrawl store publishes a port and every one sits on claw-scrapers only`, () => {
    const compose = parse(fs.readFileSync(repoPath(relative), 'utf8'));
    for (const name of FIRECRAWL_STORES) {
      const service = compose.services[name];
      assert.equal(service.ports, undefined, `${name} must not publish a port`);
      assert.deepEqual(service.networks, ['claw-scrapers'], `${name} must stay on claw-scrapers`);
    }
  });
}

test('the development Firecrawl stores are password protected too, with a default only for convenience', () => {
  const compose = parse(fs.readFileSync(repoPath(DEV_COMPOSE), 'utf8'));
  const redis = compose.services['firecrawl-redis'];
  assert.ok(redis.command.includes('--requirepass'));
  assert.match(redis.command.at(-1), /FIRECRAWL_REDIS_PASSWORD/u);
  const rabbit = environmentOf(compose.services['firecrawl-rabbitmq']);
  assert.equal(rabbit.RABBITMQ_DEFAULT_USER, 'firecrawl');
  assert.match(rabbit.RABBITMQ_DEFAULT_PASS, /FIRECRAWL_RABBITMQ_PASSWORD/u);
});

test('the installers, the rotation script and .env.example know both new Firecrawl passwords', () => {
  const read = (relative) => fs.readFileSync(repoPath(relative), 'utf8');
  for (const name of ['FIRECRAWL_REDIS_PASSWORD', 'FIRECRAWL_RABBITMQ_PASSWORD']) {
    for (const relative of ['scripts/install.sh', 'scripts/install.ps1', '.env.example']) {
      assert.ok(read(relative).includes(`${name}=`), `${relative} does not write ${name}`);
    }
    assert.ok(
      read('scripts/rotate-db-passwords.sh').includes(
        `PW_VAR[${name.replace('_PASSWORD', '')}]=${name}`,
      ),
    );
  }
  assert.match(
    read('scripts/rotate-db-passwords.sh'),
    /OTHER_KEYS="[^"]*FIRECRAWL_REDIS FIRECRAWL_RABBITMQ"/u,
  );
});
