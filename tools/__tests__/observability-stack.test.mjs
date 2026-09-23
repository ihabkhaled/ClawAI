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
const METRICS_CONTAINERS = ['prometheus', 'grafana'];

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
    assert.deepEqual(
      dev.services[name].environment,
      prod.services[name].environment,
      `${name} is configured differently in dev and prod`,
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
  const mainFile = { prometheus: 'prometheus.yml', grafana: 'grafana.ini' };
  for (const name of METRICS_CONTAINERS) {
    const directory = new RegExp(`'([^']+)\\|${name}'`, 'u').exec(table)?.[1];
    assert.ok(
      directory && fs.existsSync(repoPath(directory)),
      `the mapped directory ${String(directory)} must exist`,
    );
    assert.ok(fs.existsSync(repoPath(path.join(directory, mainFile[name]))));
  }
});

// ---------------------------------------------------------------------------
// Grafana behind the admin session (ADR-115)
// ---------------------------------------------------------------------------
// Grafana trusts one header to say who is signed in. Everything below pins the
// three things that keep that safe: nginx asks auth-service first, nginx
// always overwrites the header, and Grafana has no other way in.

const locations = fs.readFileSync(repoPath('infra/nginx/locations.conf'), 'utf8');
const grafanaIni = fs.readFileSync(repoPath('infra/grafana/grafana.ini'), 'utf8');

function locationBlock(signature) {
  const start = locations.indexOf(`location ${signature} {`);
  assert.notEqual(start, -1, `nginx has no "location ${signature}" block`);
  return locations.slice(start, locations.indexOf('\n    }', start));
}

function iniValue(section, key) {
  const body = grafanaIni.split(/^\[/mu).find((chunk) => chunk.startsWith(`${section}]`)) ?? '';
  return new RegExp(`^${key}\\s*=\\s*(.+)$`, 'mu').exec(body)?.[1]?.trim();
}

test('nginx serves /grafana/ only after auth_request', () => {
  const block = locationBlock('/grafana/');
  assert.match(block, /^\s*auth_request \/_grafana_auth;/mu);
  assert.match(block, /auth_request_set \$grafana_user \$upstream_http_x_grafana_user;/u);
  // A literal upstream makes nginx refuse to start while grafana is down.
  assert.match(block, /set \$grafana_backend http:\/\/grafana:3000;\s*proxy_pass \$grafana_backend;/u);
});

test('nginx always overwrites the identity header Grafana trusts', () => {
  const header = iniValue('auth.proxy', 'header_name');
  assert.equal(header, 'X-WEBAUTH-EMAIL');
  assert.match(locationBlock('/grafana/'), new RegExp(`proxy_set_header ${header} \\$grafana_user;`, 'u'));
});

test('the auth subrequest is internal, bodiless, GET, and aimed at the verify route', () => {
  const block = locationBlock('= /_grafana_auth');
  assert.match(block, /^\s*internal;/mu);
  assert.match(block, /proxy_method GET;/u);
  assert.match(block, /proxy_pass_request_body off;/u);
  assert.match(block, /https:\/\/auth-service:4001\/api\/v1\/auth\/grafana-access\/verify;/u);
});

test('the verify route is closed to the outside', () => {
  assert.match(locationBlock('= /api/v1/auth/grafana-access/verify'), /return 404;/u);
});

test('the cookie path auth-service sets is the path nginx protects', () => {
  const constants = fs.readFileSync(
    repoPath('apps/claw-auth-service/src/modules/grafana-access/constants/grafana-access.constants.ts'),
    'utf8',
  );
  const cookiePath = /GRAFANA_ACCESS_COOKIE_PATH = '([^']+)'/u.exec(constants)?.[1];
  assert.equal(cookiePath, '/grafana');
  assert.ok(locations.includes(`location ${cookiePath}/ {`));
});

test('Grafana has no login of its own and no built-in admin', () => {
  assert.equal(iniValue('auth.proxy', 'enabled'), 'true');
  assert.equal(iniValue('auth.proxy', 'enable_login_token'), 'false');
  assert.equal(iniValue('auth', 'disable_login_form'), 'true');
  assert.equal(iniValue('auth.basic', 'enabled'), 'false');
  assert.equal(iniValue('auth.anonymous', 'enabled'), 'false');
  assert.equal(iniValue('security', 'disable_initial_admin_creation'), 'true');
  assert.equal(iniValue('server', 'serve_from_sub_path'), 'true');
});

test('no Grafana password is set anywhere, and its secret key comes from the environment', () => {
  for (const relative of COMPOSE) {
    const env = composeFile(relative).services.grafana.environment ?? {};
    assert.equal(env.GF_SECURITY_ADMIN_PASSWORD, undefined, `${relative} sets a Grafana password`);
    assert.equal(env.GF_SECURITY_SECRET_KEY, '${GRAFANA_SECRET_KEY:-}');
    assert.match(env.GF_SERVER_ROOT_URL, /\/grafana\/$/u);
  }
  assert.doesNotMatch(grafanaIni, /^\s*(admin_password|secret_key)\s*=/mu);
  for (const relative of ['.env.example', 'scripts/install.sh', 'scripts/install.ps1']) {
    assert.match(fs.readFileSync(repoPath(relative), 'utf8'), /GRAFANA_SECRET_KEY=/u, `${relative} lacks GRAFANA_SECRET_KEY`);
  }
});

test('every provisioned dashboard reads the provisioned datasource', () => {
  const datasource = parse(
    fs.readFileSync(repoPath('infra/grafana/provisioning/datasources/prometheus.yml'), 'utf8'),
  ).datasources[0];
  assert.equal(datasource.url, 'http://prometheus:9090');
  const directory = repoPath('infra/grafana/dashboards');
  const files = fs.readdirSync(directory).filter((file) => file.endsWith('.json'));
  assert.ok(files.length >= 1, 'no dashboard is provisioned');
  for (const file of files) {
    const dashboard = JSON.parse(fs.readFileSync(path.join(directory, file), 'utf8'));
    assert.ok(dashboard.uid, `${file} has no stable uid`);
    for (const panel of dashboard.panels ?? []) {
      assert.equal(panel.datasource?.uid, datasource.uid, `${file} panel "${panel.title}" reads another datasource`);
    }
  }
  const home = iniValue('dashboards', 'default_home_dashboard_path');
  assert.ok(files.includes(path.basename(String(home))), 'the home dashboard is not provisioned');
});
