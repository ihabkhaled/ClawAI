import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';
import { URL } from 'node:url';

/**
 * Regression (QA 2026-09-23). The chat recorder calls getUserMedia on our own
 * origin. nginx sent `camera=(), microphone=()`, which the browser enforces
 * before any permission prompt, so voice and video notes failed in every
 * browser with "Permissions policy violation: microphone is not allowed".
 * Both deployment modes must allow same-origin use and nothing wider.
 */
const CONFIGS = [
  '../../infra/nginx/nginx.conf',
  '../../infra/nginx/nginx.distributed.conf.template',
];

for (const path of CONFIGS) {
  test(`${path} lets our own origin use the microphone and camera`, async () => {
    const nginx = await readFile(new URL(path, import.meta.url), 'utf8');
    const policies = [...nginx.matchAll(/add_header\s+Permissions-Policy\s+"([^"]*)"/gu)].map(
      (match) => match[1],
    );

    assert.ok(policies.length > 0, 'no Permissions-Policy header found');
    for (const policy of policies) {
      assert.match(policy, /microphone=\(self\)/u);
      assert.match(policy, /camera=\(self\)/u);
      assert.doesNotMatch(policy, /(?:microphone|camera)=\*/u);
    }
  });
}
