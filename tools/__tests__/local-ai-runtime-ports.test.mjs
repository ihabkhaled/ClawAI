import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

import { parse } from 'yaml';

import { repoPath } from '../lib/repo.mjs';

// ADR-146. Ollama, stable-diffusion (A1111) and ComfyUI authenticate nobody.
// ollama-service now requires a login, but a runtime port published on every
// interface lets anyone who can reach the host skip that guard entirely and
// call /api/generate, /api/pull or /api/delete on the raw runtime. Services
// reach these over claw-network by name, so the host mapping exists only for
// a local curl: it must be loopback.
const COMPOSE = ['docker/docker-compose.dev.ollama.yml', 'docker/docker-compose.prod.ollama.yml'];
const RUNTIMES = ['ollama', 'stable-diffusion', 'comfyui'];
const LOOPBACK_PREFIXES = ['127.0.0.1:', '[::1]:'];

/** True when a short-syntax or long-syntax port entry binds only to loopback. */
function isLoopbackPort(entry) {
  if (typeof entry === 'string') {
    return LOOPBACK_PREFIXES.some((prefix) => entry.startsWith(prefix));
  }
  return entry !== null && typeof entry === 'object' && ['127.0.0.1', '::1'].includes(entry.host_ip);
}

test('isLoopbackPort accepts loopback bindings and rejects every-interface ones', () => {
  assert.equal(isLoopbackPort('127.0.0.1:11434:11434'), true);
  assert.equal(isLoopbackPort('[::1]:11434:11434'), true);
  assert.equal(isLoopbackPort({ host_ip: '127.0.0.1', target: 11434, published: 11434 }), true);
  assert.equal(isLoopbackPort('11434:11434'), false);
  assert.equal(isLoopbackPort('0.0.0.0:11434:11434'), false);
  assert.equal(isLoopbackPort({ target: 11434, published: 11434 }), false);
});

for (const relative of COMPOSE) {
  const compose = parse(fs.readFileSync(repoPath(relative), 'utf8'));

  for (const name of RUNTIMES) {
    test(`${relative} publishes ${name} on loopback only`, () => {
      const service = compose.services[name];
      assert.ok(service, `${name} is missing from ${relative}`);
      for (const entry of service.ports ?? []) {
        assert.ok(
          isLoopbackPort(entry),
          `${name} publishes ${JSON.stringify(entry)} on every interface in ${relative}`,
        );
      }
    });
  }
}
