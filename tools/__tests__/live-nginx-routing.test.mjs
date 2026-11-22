import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';
import { URL } from 'node:url';

const readConfig = (path) =>
  readFile(new URL(`../../infra/nginx/${path}`, import.meta.url), 'utf8');

test('live route reaches live-service in both edge configs', async () => {
  const [locations, distributed] = await Promise.all([
    readConfig('locations.conf'),
    readConfig('nginx.distributed.conf.template'),
  ]);

  for (const config of [locations, distributed]) {
    assert.match(config, /location\s+\/api\/v1\/live\s*\{/u);
  }

  assert.match(locations, /set \$live_backend https:\/\/live-service:4022;/u);
  assert.match(distributed, /map \$host \$origin_live\s*\{ default "\$\{CLAW_LIVE_ORIGIN\}"; \}/u);
});

test('the session SSE stream and the HLS proxy are unbuffered and come before the generic prefix', async () => {
  const [locations, distributed] = await Promise.all([
    readConfig('locations.conf'),
    readConfig('nginx.distributed.conf.template'),
  ]);

  for (const config of [locations, distributed]) {
    const sse = config.search(/location\s+~\s+\^\/api\/v1\/live\/sessions\/\[\^\/\]\+\/stream\$/u);
    const hls = config.search(/location\s+~\s+\^\/api\/v1\/live\/streams\/\[\^\/\]\+\/hls\//u);
    const prefix = config.search(/location\s+\/api\/v1\/live\s*\{/u);
    assert.ok(sse >= 0 && hls >= 0 && prefix >= 0, 'all three live locations exist');
    assert.ok(sse < prefix && hls < prefix, 'regex locations sit before the generic prefix');

    for (const start of [sse, hls]) {
      const block = config.slice(start, config.indexOf('}', start));
      assert.match(block, /proxy_buffering off;/u);
      assert.match(block, /proxy_read_timeout \d+;/u);
    }
  }
});

test('the live internal routes stay closed at the edge', async () => {
  const locations = await readConfig('locations.conf');

  assert.match(locations, /location\s+\/api\/v1\/internal\/\s*\{\s*return 404;/u);
  assert.doesNotMatch(locations, /location\s+[^{]*\/internal\/live/u);
});

test('the distributed example names the live origin', async () => {
  assert.match(await readConfig('.env.distributed.example'), /^CLAW_LIVE_ORIGIN=\S+$/mu);
});
