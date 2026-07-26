import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';
import { URL } from 'node:url';

test('nginx does not expose the payment service internal API', async () => {
  const nginx = await readFile(new URL('../../infra/nginx/nginx.conf', import.meta.url), 'utf8');
  assert.doesNotMatch(nginx, /location\s+\/api\/v1\/internal\/payments(?:\s|\/|\{)/u);
});
