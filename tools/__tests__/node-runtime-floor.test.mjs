import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { runInNewContext } from 'node:vm';

import { repoPath } from '../lib/repo.mjs';
import {
  DOCKER_GUARD_LINE,
  ENGINES_RANGE,
  FLOORS,
  meetsFloor,
  withGuard,
} from '../security/node-runtime-floor.mjs';

const dockerfiles = execFileSync('git', ['ls-files'], { cwd: repoPath(), encoding: 'utf8' })
  .split('\n')
  .filter((file) => /(^|\/)Dockerfile[^/]*$/u.test(file));

test('floors are the Node.js 2026-10-21 security release (CVE-2026-111497)', () => {
  assert.deepEqual(FLOORS, { 22: [23, 4], 24: [22, 1], 26: [12, 1] });
});

test('meetsFloor rejects every vulnerable build and EOL or odd lines', () => {
  for (const version of [
    'v22.23.3',
    'v24.22.0',
    'v26.12.0',
    'v26.7.0',
    '24.18.0',
    'v20.19.0',
    'v25.9.0',
  ]) {
    assert.equal(meetsFloor(version), false, version);
  }
  for (const version of ['v22.23.4', 'v22.24.0', 'v24.22.1', 'v26.12.1', 'v26.13.0', 'v27.0.0']) {
    assert.equal(meetsFloor(version), true, version);
  }
});

test('the build guard in the Dockerfiles agrees with meetsFloor', () => {
  const script = /node -e "(.+)"$/u.exec(DOCKER_GUARD_LINE)?.[1];
  assert.ok(script, 'guard line has an inline script');
  for (const version of [
    '22.23.3',
    '22.23.4',
    '24.22.0',
    '24.22.1',
    '26.7.0',
    '26.12.1',
    '27.1.0',
    '20.19.0',
  ]) {
    let exitCode = 0;
    const sandbox = {
      process: {
        versions: { node: version },
        version: `v${version}`,
        exit: (code) => {
          exitCode = code;
        },
      },
      console: { error: () => {} },
    };
    runInNewContext(script, sandbox);
    assert.equal(exitCode === 0, meetsFloor(version), `guard vs meetsFloor for ${version}`);
  }
});

test('package.json engines admits only patched runtimes', () => {
  const { engines } = JSON.parse(readFileSync(repoPath('package.json'), 'utf8'));
  assert.equal(engines.node, ENGINES_RANGE);
});

test('every Dockerfile discovered in git guards every node base stage', () => {
  assert.ok(dockerfiles.length >= 40, `found ${dockerfiles.length} Dockerfiles`);
  for (const file of dockerfiles) {
    const source = readFileSync(repoPath(file), 'utf8');
    assert.equal(
      withGuard(source),
      source,
      `${file} is missing or has a stale Node floor guard (run node tools/security/node-runtime-floor.mjs --sync)`,
    );
    for (const [index, line] of source.split('\n').entries()) {
      if (!/^FROM node:/u.test(line)) continue;
      assert.equal(
        source.split('\n')[index + 1].replace(/\r$/u, ''),
        DOCKER_GUARD_LINE,
        `${file}: guard must directly follow "${line.trim()}"`,
      );
    }
  }
});

test('production builds always pull a fresh base image', () => {
  const deploy = readFileSync(repoPath('scripts/deploy-prod.sh'), 'utf8');
  assert.match(deploy, /"\$\{COMPOSE_ARGS\[@\]\}" build --pull "\$@"/u);
});
