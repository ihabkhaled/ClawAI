import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import process from 'node:process';
import { test } from 'node:test';

import { repoPath } from '../lib/repo.mjs';

const gitBash = 'C:/Program Files/Git/bin/bash.exe';
const bashBinary = process.platform === 'win32' && existsSync(gitBash) ? gitBash : 'bash';
const toBashPath = (path) => path.replaceAll('\\', '/');

const ensureScript = toBashPath(repoPath('scripts/ensure-prod-env.sh'));
const manifestPath = toBashPath(repoPath('scripts/prod-required-env.manifest'));
const manifest = readFileSync(repoPath('scripts/prod-required-env.manifest'), 'utf8');
const deployScript = readFileSync(repoPath('scripts/deploy-prod.sh'), 'utf8').replaceAll(
  '\r\n',
  '\n',
);

const VALID_KEY = 'a1'.repeat(32);
const VALID_PASSWORD = 'p'.repeat(40);

function withEnvFile(content, run) {
  const dir = mkdtempSync(join(tmpdir(), 'claw-ensure-env-'));
  const envFile = toBashPath(join(dir, '.env'));
  writeFileSync(join(dir, '.env'), content);
  try {
    return run(envFile, () => readFileSync(join(dir, '.env'), 'utf8'));
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

function ensure(envFile, ...args) {
  const result = spawnSync(
    bashBinary,
    [ensureScript, '--env', envFile, '--manifest', manifestPath, ...args],
    { encoding: 'utf8' },
  );
  return {
    status: result.status,
    output: `${result.stdout}${result.stderr}`.replaceAll('\r', ''),
  };
}

function valueOf(envText, name) {
  const lines = envText.replaceAll('\r', '').split('\n');
  const match = lines.filter((line) => line.startsWith(`${name}=`)).at(-1);
  return match === undefined ? undefined : match.slice(name.length + 1);
}

test('ensure-prod-env.sh is syntactically valid bash', () => {
  const result = spawnSync(bashBinary, ['-n', ensureScript], { encoding: 'utf8' });
  assert.equal(result.status, 0, result.stderr);
});

test('a .env without the plugin values gets them appended and the old lines are untouched', () => {
  const original = 'JWT_SECRET=keep-me-exactly\nADMIN_EMAIL=admin@claw.local\n';
  withEnvFile(original, (envFile, read) => {
    const run = ensure(envFile);
    assert.equal(run.status, 0, run.output);
    const text = read();
    assert.ok(text.startsWith(original), 'existing lines must stay byte-for-byte');
    assert.match(valueOf(text, 'PLUGIN_ENCRYPTION_KEY') ?? '', /^[0-9a-f]{64}$/u);
    assert.doesNotMatch(valueOf(text, 'PLUGIN_ENCRYPTION_KEY') ?? '', /^0+$/u);
    const password = valueOf(text, 'PG_PLUGIN_PASSWORD') ?? '';
    assert.ok(password.length >= 24 && password !== 'claw_secret');
    assert.equal(
      valueOf(text, 'PLUGIN_DATABASE_URL'),
      `postgresql://claw:${password}@pg-plugin:5432/claw_plugin?schema=public`,
      'the connection string must carry the same password the database is created with',
    );
  });
});

test('ensure-prod-env.sh never prints a secret value', () => {
  withEnvFile('JWT_SECRET=x\n', (envFile, read) => {
    const run = ensure(envFile);
    const text = read();
    for (const name of ['PLUGIN_ENCRYPTION_KEY', 'PG_PLUGIN_PASSWORD']) {
      const secret = valueOf(text, name) ?? '';
      assert.ok(secret.length > 0);
      assert.ok(!run.output.includes(secret), `${name} value leaked into the output`);
    }
    assert.match(run.output, /added\s+PLUGIN_ENCRYPTION_KEY/u);
  });
});

test('running it twice changes nothing the second time', () => {
  withEnvFile('JWT_SECRET=x\n', (envFile, read) => {
    assert.equal(ensure(envFile).status, 0);
    const afterFirst = read();
    const second = ensure(envFile);
    assert.equal(second.status, 0, second.output);
    assert.equal(read(), afterFirst);
    assert.doesNotMatch(second.output, /added /u);
  });
});

test('an existing valid secret is never overwritten', () => {
  const content = [
    `PLUGIN_ENCRYPTION_KEY=${VALID_KEY}`,
    `PG_PLUGIN_PASSWORD=${VALID_PASSWORD}`,
    '',
  ].join('\n');
  withEnvFile(content, (envFile, read) => {
    const run = ensure(envFile);
    assert.equal(run.status, 0, run.output);
    const text = read();
    assert.equal(valueOf(text, 'PLUGIN_ENCRYPTION_KEY'), VALID_KEY);
    assert.equal(valueOf(text, 'PG_PLUGIN_PASSWORD'), VALID_PASSWORD);
    assert.equal(
      valueOf(text, 'PLUGIN_DATABASE_URL'),
      `postgresql://claw:${VALID_PASSWORD}@pg-plugin:5432/claw_plugin?schema=public`,
      'a missing URL is derived from the password already in the file',
    );
  });
});

test('an all-zero, short or non-hex PLUGIN_ENCRYPTION_KEY is reported invalid and left alone', () => {
  for (const bad of ['0'.repeat(64), 'abc123', 'z'.repeat(64)]) {
    const content = `PLUGIN_ENCRYPTION_KEY=${bad}\n`;
    withEnvFile(content, (envFile, read) => {
      const run = ensure(envFile);
      assert.equal(run.status, 1, run.output);
      assert.match(run.output, /INVALID\s+PLUGIN_ENCRYPTION_KEY/u);
      assert.equal(valueOf(read(), 'PLUGIN_ENCRYPTION_KEY'), bad, 'a bad secret is not rotated');
    });
  }
});

test('the committed default database password is rejected for production', () => {
  withEnvFile('PG_PLUGIN_PASSWORD=claw_secret\n', (envFile) => {
    const run = ensure(envFile, '--check');
    assert.equal(run.status, 1, run.output);
    assert.match(run.output, /INVALID\s+PG_PLUGIN_PASSWORD/u);
  });
});

test('a connection string whose password differs from PG_PLUGIN_PASSWORD is invalid', () => {
  const content = [
    `PG_PLUGIN_PASSWORD=${VALID_PASSWORD}`,
    `PLUGIN_ENCRYPTION_KEY=${VALID_KEY}`,
    'PLUGIN_DATABASE_URL=postgresql://claw:someone-else@pg-plugin:5432/claw_plugin?schema=public',
    '',
  ].join('\n');
  withEnvFile(content, (envFile) => {
    const run = ensure(envFile, '--check');
    assert.equal(run.status, 1, run.output);
    assert.match(run.output, /INVALID\s+PLUGIN_DATABASE_URL/u);
  });
});

test('--check reports what is missing and writes nothing', () => {
  const content = 'JWT_SECRET=x\n';
  withEnvFile(content, (envFile, read) => {
    const run = ensure(envFile, '--check');
    assert.equal(run.status, 1, run.output);
    for (const name of ['PG_PLUGIN_PASSWORD', 'PLUGIN_DATABASE_URL', 'PLUGIN_ENCRYPTION_KEY']) {
      assert.match(run.output, new RegExp(`MISSING\\s+${name}`, 'u'));
    }
    assert.equal(read(), content);
  });
});

test('--services limits the check to the services a rollout touches', () => {
  withEnvFile('JWT_SECRET=x\n', (envFile) => {
    assert.equal(ensure(envFile, '--check', '--services', 'chat-service').status, 0);
    assert.equal(ensure(envFile, '--check', '--services', 'plugin-service').status, 1);
  });
});

test('a .env with no trailing newline does not get its last line glued to the first addition', () => {
  withEnvFile('JWT_SECRET=x', (envFile, read) => {
    assert.equal(ensure(envFile).status, 0);
    const text = read();
    assert.equal(valueOf(text, 'JWT_SECRET'), 'x');
    assert.ok(valueOf(text, 'PLUGIN_ENCRYPTION_KEY'));
  });
});

test('CRLF values and quoted values are read the way docker compose reads them', () => {
  const content = `PLUGIN_ENCRYPTION_KEY="${VALID_KEY}"\r\nPG_PLUGIN_PASSWORD=${VALID_PASSWORD}\r\n`;
  withEnvFile(content, (envFile) => {
    const run = ensure(envFile, '--check', '--services', 'plugin-service');
    assert.doesNotMatch(run.output, /INVALID\s+(PLUGIN_ENCRYPTION_KEY|PG_PLUGIN_PASSWORD)/u);
  });
});

test('the manifest lists every variable the plugin service cannot boot without', () => {
  const config = readFileSync(
    repoPath('apps/claw-plugin-service/src/app/config/app.config.ts'),
    'utf8',
  );
  const listed = manifest
    .split('\n')
    .filter((line) => line.startsWith('plugin-service|'))
    .map((line) => line.split('|')[1]);
  for (const required of ['PLUGIN_DATABASE_URL', 'PLUGIN_ENCRYPTION_KEY']) {
    assert.match(config, new RegExp(`${required}:`, 'u'), `${required} left app.config.ts`);
    assert.ok(listed.includes(required), `${required} is missing from the manifest`);
  }
  assert.ok(listed.includes('PG_PLUGIN_PASSWORD'));
  assert.match(manifest, /plugin-service\|-\|database\|claw-pg-plugin/u);
});

test('every manifest line is well formed and names no secret value', () => {
  const kinds = new Set(['hex64', 'password', 'derived', 'literal', 'database', 'cert-san']);
  for (const line of manifest.split('\n')) {
    if (line === '' || line.startsWith('#')) continue;
    const parts = line.split('|');
    assert.equal(parts.length, 4, `bad manifest line: ${line}`);
    assert.ok(kinds.has(parts[2]), `unknown kind in: ${line}`);
    if (parts[2] === 'derived') assert.match(parts[3], /\{[A-Z0-9_]+\}/u);
    else if (parts[2] === 'literal') assert.match(parts[3], /^https:\/\/[a-z-]+:\d+$/u);
    else if (!['database', 'cert-san'].includes(parts[2]))
      assert.equal(parts[3], '', 'only derived and literal rules take a value');
  }
});

test('the install scripts and .env.example carry every manifest variable', () => {
  const sources = {
    'scripts/install.sh': readFileSync(repoPath('scripts/install.sh'), 'utf8'),
    'scripts/install.ps1': readFileSync(repoPath('scripts/install.ps1'), 'utf8'),
    '.env.example': readFileSync(repoPath('.env.example'), 'utf8'),
  };
  const names = manifest
    .split('\n')
    .filter((line) => line !== '' && !line.startsWith('#'))
    .map((line) => line.split('|')[1])
    .filter((name) => name !== '-');
  for (const [file, text] of Object.entries(sources)) {
    for (const name of names) {
      assert.match(text, new RegExp(`^${name}=`, 'mu'), `${file} does not write ${name}`);
    }
  }
});

// --- the deploy preflight ----------------------------------------------------

function bashFunction(name) {
  const start = deployScript.indexOf(`\n${name}() {`);
  assert.ok(start > -1, `${name} is missing from deploy-prod.sh`);
  const end = deployScript.indexOf('\n}\n', start);
  return deployScript.slice(start + 1, end + 2);
}

/**
 * Runs assert_required_production_config with Git, Docker and the logging helpers
 * replaced by stand-ins. `dbState` is what Docker would say about the database.
 */
function runPreflight({ envContent, services, dbState, certStatus = 0, withManifest = true }) {
  const dir = mkdtempSync(join(tmpdir(), 'claw-preflight-'));
  const tmp = toBashPath(dir);
  writeFileSync(join(dir, '.env'), envContent);
  try {
    const source = [
      'set -u',
      `TMP_DIR='${tmp}'`,
      `ENV_FILE='${tmp}/.env'`,
      "PROJECT_ROOT='/srv/clawai'",
      "DB_COMPOSE_REL='docker/docker-compose.prod.databases.yml'",
      `PLAN_SERVICES=(${services.map((s) => `'${s}'`).join(' ')})`,
      'PLAN_IMAGE_SERVICES=()',
      'log() { printf "%s\\n" "$*"; }',
      'err() { printf "%s\\n" "$*" >&2; }',
      'section() { printf "\\n%s\\n" "$*"; }',
      'die() { err "DEPLOYMENT FAILED: $*"; exit 1; }',
      `database_container_state() { printf '%s' '${dbState}'; }`,
      `certificate_has_san() { return ${certStatus}; }`,
      withManifest
        ? `git() { case "$2" in *prod-required-env.manifest) cat '${manifestPath}';; *ensure-prod-env.sh) cat '${ensureScript}';; esac; }`
        : 'git() { return 1; }',
      bashFunction('assert_required_production_config'),
      'assert_required_production_config deadbeef',
    ].join('\n');
    const result = spawnSync(bashBinary, ['-c', source], { encoding: 'utf8' });
    return {
      status: result.status,
      output: `${result.stdout}${result.stderr}`.replaceAll('\r', ''),
    };
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

const GOOD_ENV = [
  `PLUGIN_ENCRYPTION_KEY=${VALID_KEY}`,
  `PG_PLUGIN_PASSWORD=${VALID_PASSWORD}`,
  `PLUGIN_DATABASE_URL=postgresql://claw:${VALID_PASSWORD}@pg-plugin:5432/claw_plugin?schema=public`,
  'PLUGIN_SERVICE_URL=https://plugin-service:4021',
  '',
].join('\n');

test('the deploy refuses a plugin-service rollout whose .env lacks the new values, naming them', () => {
  const run = runPreflight({
    envContent: 'JWT_SECRET=x\n',
    services: ['plugin-service'],
    dbState: 'healthy',
  });
  assert.equal(run.status, 1, run.output);
  assert.match(run.output, /MISSING\s+PLUGIN_ENCRYPTION_KEY/u);
  assert.match(run.output, /MISSING\s+PG_PLUGIN_PASSWORD/u);
  assert.match(run.output, /ensure-prod-env\.sh/u);
  assert.match(run.output, /add-a-service-to-production\.md/u);
});

test('the deploy refuses a plugin-service rollout whose database container is not running', () => {
  for (const state of ['absent', 'unhealthy', 'starting', 'exited']) {
    const run = runPreflight({
      envContent: GOOD_ENV,
      services: ['plugin-service'],
      dbState: state,
    });
    assert.equal(run.status, 1, `${state}: ${run.output}`);
    assert.match(run.output, /claw-pg-plugin/u);
    assert.match(run.output, /up -d pg-plugin/u);
  }
});

test('the deploy passes a plugin-service rollout when the values are valid and the database is healthy', () => {
  const run = runPreflight({
    envContent: GOOD_ENV,
    services: ['plugin-service'],
    dbState: 'healthy',
  });
  assert.equal(run.status, 0, run.output);
  assert.match(run.output, /database claw-pg-plugin is healthy/u);
});

test('a rollout that does not touch plugin-service is not held up by its configuration', () => {
  const run = runPreflight({
    envContent: 'JWT_SECRET=x\n',
    services: ['chat-service', 'frontend'],
    dbState: 'absent',
  });
  assert.equal(run.status, 0, run.output);
});

test('a target commit that predates the manifest is not blocked', () => {
  const run = runPreflight({
    envContent: 'JWT_SECRET=x\n',
    services: ['plugin-service'],
    dbState: 'absent',
    withManifest: false,
  });
  assert.equal(run.status, 0, run.output);
});

test('the deploy never prints secret values from the .env while checking', () => {
  const run = runPreflight({
    envContent: `PLUGIN_ENCRYPTION_KEY=${'0'.repeat(64)}\nPG_PLUGIN_PASSWORD=claw_secret\n`,
    services: ['plugin-service'],
    dbState: 'healthy',
  });
  assert.equal(run.status, 1);
  assert.doesNotMatch(run.output, /claw_secret/u);
  assert.doesNotMatch(run.output, /0{64}/u);
});

test('the preflight runs before anything is built, recreated or checked out', () => {
  const call = deployScript.indexOf('\n  assert_required_production_config "$new_sha"');
  assert.ok(call > -1, 'main never calls assert_required_production_config');
  for (const later of ['git checkout --detach', 'Building services...']) {
    const at = deployScript.indexOf(later, call);
    assert.ok(at > call, `${later} must come after the required-config check`);
  }
  assert.ok(
    deployScript.indexOf('compute_plan\n', deployScript.indexOf('resolve_active_profiles\n')) <
      call,
    'the check needs the plan, so it runs after compute_plan',
  );
});

test('the deploy refuses a plugin-service rollout whose certificate does not list the service', () => {
  const run = runPreflight({
    envContent: GOOD_ENV,
    services: ['plugin-service'],
    dbState: 'healthy',
    certStatus: 1,
  });
  assert.equal(run.status, 1, run.output);
  assert.match(run.output, /does not list plugin-service as a subject alternative name/u);
  assert.match(run.output, /install-tls.sh/u);
});

test('an unreadable certificate check (no openssl) warns instead of blocking', () => {
  const run = runPreflight({
    envContent: GOOD_ENV,
    services: ['plugin-service'],
    dbState: 'healthy',
    certStatus: 2,
  });
  assert.equal(run.status, 0, run.output);
  assert.match(run.output, /WARNING: openssl is unavailable/u);
});

test('certificate_has_san answers from the real SAN list of a certificate', () => {
  const dir = mkdtempSync(join(tmpdir(), 'claw-cert-'));
  const bashDir = toBashPath(dir);
  try {
    const source = [
      'set -e',
      'export MSYS_NO_PATHCONV=1',
      bashFunction('certificate_has_san'),
      `openssl req -x509 -newkey rsa:2048 -nodes -days 1 -subj '/CN=test' -addext 'subjectAltName=DNS:plugin-service,DNS:threads-service,IP:127.0.0.1' -keyout '${bashDir}/k.pem' -out '${bashDir}/c.pem' >/dev/null 2>&1`,
      `for san in plugin-service threads-service; do certificate_has_san '${bashDir}/c.pem' "$san" && echo "yes:$san"; done`,
      `certificate_has_san '${bashDir}/c.pem' plugin || echo no:plugin-prefix`,
      `certificate_has_san '${bashDir}/c.pem' auth-service || echo no:auth-service`,
      `certificate_has_san '${bashDir}/missing.pem' plugin-service || echo no:missing-file`,
    ].join(String.fromCharCode(10));
    const result = spawnSync(bashBinary, ['-c', source], { encoding: 'utf8' });
    if (result.status !== 0 && /openssl: command not found|not found/u.test(result.stderr)) return;
    assert.equal(result.status, 0, result.stderr);
    const out = result.stdout.replaceAll(String.fromCharCode(13), '');
    assert.match(out, /yes:plugin-service/u);
    assert.match(out, /yes:threads-service/u);
    assert.match(out, /no:plugin-prefix/u, 'a name must match whole, not by prefix');
    assert.match(out, /no:auth-service/u);
    assert.match(out, /no:missing-file/u);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('health-service and the plugin-service rollout get PLUGIN_SERVICE_URL, or the shared HTTP client refuses the host', () => {
  for (const service of ['health-service', 'plugin-service']) {
    assert.ok(
      manifest.includes(`${service}|PLUGIN_SERVICE_URL|literal|https://plugin-service:4021\n`),
      `${service} must require PLUGIN_SERVICE_URL`,
    );
  }
  withEnvFile('JWT_SECRET=x\n', (envFile, read) => {
    const check = ensure(envFile, '--check', '--services', 'health-service');
    assert.equal(check.status, 1, check.output);
    assert.match(check.output, /MISSING\s+PLUGIN_SERVICE_URL \(health-service\)/u);
    const run = ensure(envFile, '--services', 'health-service');
    assert.equal(run.status, 0, run.output);
    assert.equal(valueOf(read(), 'PLUGIN_SERVICE_URL'), 'https://plugin-service:4021');
  });
});

test('a PLUGIN_SERVICE_URL that is set to something else is reported and left alone', () => {
  withEnvFile('PLUGIN_SERVICE_URL=https://elsewhere:1\n', (envFile, read) => {
    const run = ensure(envFile, '--services', 'health-service');
    assert.equal(run.status, 1, run.output);
    assert.match(run.output, /INVALID\s+PLUGIN_SERVICE_URL/u);
    assert.equal(valueOf(read(), 'PLUGIN_SERVICE_URL'), 'https://elsewhere:1');
  });
});
