import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';
import { URL } from 'node:url';

test('publication gateway route stays separate from legacy chat threads', async () => {
  const configs = await Promise.all([
    readFile(new URL('../../infra/nginx/locations.conf', import.meta.url), 'utf8'),
    readFile(new URL('../../infra/nginx/nginx.distributed.conf.template', import.meta.url), 'utf8'),
  ]);

  for (const config of configs) {
    assert.match(config, /location\s+\/api\/v1\/thread-publications\s*\{/u);
    assert.match(config, /location\s+\/api\/v1\/threads\s*\{[\s\S]*?\/api\/v1\/chat-threads/u);
  }

  assert.match(configs[0], /set \$threads_backend https:\/\/threads-service:4019;/u);
  assert.match(configs[1], /set \$backend https:\/\/\$origin_threads;/u);
});
