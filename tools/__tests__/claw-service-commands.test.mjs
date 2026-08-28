import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

import { repoPath } from '../lib/repo.mjs';

const SOURCE = readFileSync(repoPath('scripts/claw.sh'), 'utf8');

/** The body of one `case` arm, up to its `;;`. */
function commandBlock(command) {
  const start = SOURCE.indexOf(`  ${command})\n`);
  assert.notEqual(start, -1, `missing claw.sh command ${command}`);
  const end = SOURCE.indexOf('\n    ;;', start);
  assert.notEqual(end, -1, `command ${command} has no terminating ;;`);
  return SOURCE.slice(start, end);
}

test('service:recreate and service:rebuild stay scoped to one service', () => {
  // --no-deps is the whole safety property. Without it compose walks
  // depends_on and recreates the databases underneath a running stack, which
  // is the accident these commands exist to make impossible.
  for (const command of ['service:recreate', 'service:rebuild']) {
    const block = commandBlock(command);
    assert.match(block, /--no-deps/u, `${command} must pass --no-deps`);
    assert.match(block, /--force-recreate/u, `${command} must force the recreate`);
    assert.match(block, /"\$\{@:2\}"/u, `${command} must act on the named services`);
  }
});

test('service:recreate never rebuilds', () => {
  // Its contract is "re-read .env". A silent rebuild would make it slow,
  // surprising, and capable of shipping unrelated committed changes.
  const block = commandBlock('service:recreate');
  assert.match(block, /--no-build/u);
  assert.doesNotMatch(block, /compose \$ENV_FILE_FLAG -p claw \$SVC_FLAGS build/u);
});

test('service:rebuild builds the named service before recreating it', () => {
  const block = commandBlock('service:rebuild');
  assert.match(block, /\$SVC_FLAGS build --progress plain "\$\{@:2\}"/u);
});

test('both commands refuse to run without a service name', () => {
  // Bare `docker compose up -d --force-recreate` with no service is the whole
  // stack. A missing argument must fail, never widen the blast radius.
  for (const command of ['service:recreate', 'service:rebuild']) {
    const block = commandBlock(command);
    assert.match(block, /if \[ -z "\$2" \]; then/u, `${command} must guard a missing argument`);
    assert.match(block, /exit 1/u, `${command} must exit non-zero when unnamed`);
  }
});

test('both commands are documented in the usage text', () => {
  // An undiscoverable command is why the operator reached for `docker restart`
  // in the first place.
  assert.match(SOURCE, /service:recreate <svc>/u);
  assert.match(SOURCE, /service:rebuild <svc>/u);
});

test('claw.sh never passes --remove-orphans', () => {
  // The databases live in a separate compose file under the same `claw`
  // project, so compose would treat every one of them as an orphan and delete
  // it. deploy-prod.sh carries the same prohibition.
  assert.doesNotMatch(SOURCE, /--remove-orphans/u);
});
