// Crawl4AI 0.9.2+ binds 0.0.0.0 and requires `Authorization: Bearer` only
// when CRAWL4AI_API_TOKEN is set. Without it the server logs "No
// CRAWL4AI_API_TOKEN set; generated an ephemeral token for this loopback
// session", listens on the container's own 127.0.0.1, and research-service
// gets ECONNREFUSED on http://crawl4ai:11235 — while the healthcheck (which
// curls localhost inside the container) stays green. Found on prod 2026-09-25.
//
// This pins the wiring that fixes it: the crawl4ai service is handed the token
// explicitly (and nothing else — no env_file), the installers generate it, and
// .env.example documents it.

import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

import { repoPath } from '../lib/repo.mjs';

const COMPOSE_FILES = [
  'docker/docker-compose.dev.services.yml',
  'docker/docker-compose.prod.services.yml',
];

/** The text of one top-level compose service block. */
function serviceBlock(compose, name) {
  const start = compose.indexOf(`\n  ${name}:\n`);
  assert.notEqual(start, -1, `service ${name} not found`);
  const rest = compose.slice(start + 1);
  const next = rest.slice(1).search(/\n {2}[a-z0-9-]+:\n/);
  return next === -1 ? rest : rest.slice(0, next + 1);
}

for (const file of COMPOSE_FILES) {
  test(`${file}: crawl4ai receives CRAWL4AI_API_TOKEN and no env_file`, () => {
    const block = serviceBlock(readFileSync(repoPath(file), 'utf8'), 'crawl4ai');
    assert.match(block, /CRAWL4AI_API_TOKEN: \$\{CRAWL4AI_API_TOKEN:-\}/);
    assert.doesNotMatch(block, /^ +env_file:/m, 'crawl4ai must not see every platform secret');
  });

  test(`${file}: research-service reads the shared .env (where the token lives)`, () => {
    const block = serviceBlock(readFileSync(repoPath(file), 'utf8'), 'research-service');
    assert.match(block, /env_file: \.\.\/\.env/);
  });
}

test('install.sh generates CRAWL4AI_API_TOKEN, preserves an existing one, and writes it', () => {
  const script = readFileSync(repoPath('scripts/install.sh'), 'utf8');
  assert.match(script, /CRAWL4AI_API_TOKEN=\$\(gen_secret_hex\)/);
  assert.match(script, /get_env_value "CRAWL4AI_API_TOKEN"/);
  assert.match(script, /^CRAWL4AI_API_TOKEN=\$\{CRAWL4AI_API_TOKEN\}$/m);
});

test('install.ps1 generates CRAWL4AI_API_TOKEN, preserves an existing one, and writes it', () => {
  const script = readFileSync(repoPath('scripts/install.ps1'), 'utf8');
  assert.match(script, /Get-EnvValue -Path \$envFile -Key 'CRAWL4AI_API_TOKEN'/);
  assert.match(script, /\$crawl4aiApiToken = New-SecretHex/);
  assert.match(script, /^CRAWL4AI_API_TOKEN=\$crawl4aiApiToken\r?$/m);
});

test('.env.example documents CRAWL4AI_API_TOKEN without a value', () => {
  const example = readFileSync(repoPath('.env.example'), 'utf8');
  assert.match(example, /^# CRAWL4AI_API_TOKEN=\r?$/m);
});
