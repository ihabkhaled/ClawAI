import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';
import { URL } from 'node:url';

test('nginx does not expose the payment service internal API', async () => {
  const nginx = await readFile(new URL('../../infra/nginx/nginx.conf', import.meta.url), 'utf8');
  assert.doesNotMatch(nginx, /location\s+\/api\/v1\/internal\/payments(?:\s|\/|\{)/u);
});

test('both nginx deployment modes expose every public payment route', async () => {
  const configs = await Promise.all([
    readFile(new URL('../../infra/nginx/nginx.conf', import.meta.url), 'utf8'),
    readFile(new URL('../../infra/nginx/nginx.distributed.conf.template', import.meta.url), 'utf8'),
  ]);

  for (const nginx of configs) {
    assert.match(nginx, /location\s+\/api\/v1\/payments\/webhooks\s*\{/u);
    assert.match(nginx, /location\s+\/api\/v1\/payments\s*\{/u);
    assert.match(nginx, /location\s+\/api\/v1\/billing\s*\{/u);
    assert.match(nginx, /location\s+\/api\/v1\/admin\/billing\s*\{/u);
    assert.doesNotMatch(nginx, /location\s+\/api\/v1\/internal\/payments(?:\s|\/|\{)/u);
  }
});
