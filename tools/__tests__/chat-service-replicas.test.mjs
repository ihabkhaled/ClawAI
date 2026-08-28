import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

import { repoPath } from '../lib/repo.mjs';

const COMPOSE_FILES = [
  'docker/docker-compose.prod.services.yml',
  'docker/docker-compose.dev.services.yml',
];
const DEPLOY = readFileSync(repoPath('scripts/deploy-prod.sh'), 'utf8');

/** The YAML block for one compose service, up to the next service key. */
function serviceBlock(source, name) {
  const lines = source.split(/\r?\n/u);
  const start = lines.indexOf(`  ${name}:`);
  assert.notEqual(start, -1, `missing compose service ${name}`);
  const rest = lines.slice(start + 1);
  const end = rest.findIndex((line) => /^ {2}\S/u.test(line));
  return (end === -1 ? rest : rest.slice(0, end)).join('\n');
}

for (const file of COMPOSE_FILES) {
  const source = readFileSync(repoPath(file), 'utf8');
  const block = serviceBlock(source, 'chat-service');

  test(`${file}: chat-service fixes neither a container name nor a host port`, () => {
    // Docker refuses to scale a service that does either — four containers
    // cannot share one name, and they cannot all bind host port 4002. Both
    // failures happen at `up`, so this is the check that keeps scaling possible
    // at all.
    assert.doesNotMatch(block, /container_name:/u);
    assert.doesNotMatch(block, /^\s+- '4002:4002'/mu);
  });

  test(`${file}: chat-service takes its replica count from the environment`, () => {
    // Defaulting to 1 matters: any other value is only safe because the stream
    // bus and the Stop broadcast are in Redis. A hardcoded 4 would make that a
    // property of the file rather than a deliberate decision.
    assert.match(block, /replicas: \$\{CHAT_SERVICE_REPLICAS:-1\}/u);
  });
}

test('every other service still fixes its container name', () => {
  // Only chat-service has been made scalable. If this starts failing, someone
  // has scaled a service whose in-process state has not been audited.
  const source = readFileSync(repoPath(COMPOSE_FILES[0]), 'utf8');
  const named = source.match(/container_name: claw-/gu) ?? [];
  assert.ok(named.length > 10, 'expected the other services to keep fixed names');
  assert.doesNotMatch(source, /container_name: claw-chat-service/u);
});

test('the deploy waits for every replica, not just the first', () => {
  // `compose ps -q | head -1` reported the whole rollout healthy as soon as
  // replica 1 came up, so a bad image could crash-loop the rest and still be
  // recorded as a successful deployment.
  assert.doesNotMatch(DEPLOY, /compose ps -q "\$service"[^\n]*head -1/u);
  assert.match(DEPLOY, /wait_for_service_health\(\)/u);
  assert.match(DEPLOY, /ready" -eq "\$total/u);
});

test('a scaled service is rolled one replica at a time', () => {
  // Otherwise every release drops every in-flight stream and takes chat down.
  assert.match(DEPLOY, /rolling_recreate_service\(\)/u);
  assert.match(DEPLOY, /--no-recreate/u);
});

test('the rolling path never actually passes --remove-orphans', () => {
  // The databases live in a separate compose file under the same project, so
  // the flag would delete every one of them. Checked on non-comment lines only:
  // the script documents the prohibition in prose, and a bare substring search
  // fails on the very comment that warns against it.
  const executable = DEPLOY.split(String.fromCharCode(10)).filter(
    (line) => !line.trim().startsWith('#'),
  );

  assert.deepEqual(
    executable.filter((line) => line.includes('--remove-orphans')),
    [],
  );
});

test('the replica count is documented everywhere an operator would look', () => {
  for (const file of ['.env.example', 'scripts/install.sh', 'scripts/install.ps1']) {
    assert.match(
      readFileSync(repoPath(file), 'utf8'),
      /CHAT_SERVICE_REPLICAS/u,
      `${file} does not mention CHAT_SERVICE_REPLICAS`,
    );
  }
});
