import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';
import { URL } from 'node:url';

const readConfig = (path) =>
  readFile(new URL(`../../infra/nginx/${path}`, import.meta.url), 'utf8');

test('plugins route reaches plugin-service in both edge configs', async () => {
  const [locations, distributed] = await Promise.all([
    readConfig('locations.conf'),
    readConfig('nginx.distributed.conf.template'),
  ]);

  for (const config of [locations, distributed]) {
    assert.match(config, /location\s+\/api\/v1\/plugins\s*\{/u);
  }

  assert.match(locations, /set \$plugin_backend https:\/\/plugin-service:4021;/u);
  assert.match(
    distributed,
    /map \$host \$origin_plugin\s*\{ default "\$\{CLAW_PLUGIN_ORIGIN\}"; \}/u,
  );
});

test('the plugin internal routes stay closed at the edge', async () => {
  const locations = await readConfig('locations.conf');

  assert.match(locations, /location\s+\/api\/v1\/internal\/\s*\{\s*return 404;/u);
  assert.doesNotMatch(locations, /location\s+[^{]*\/internal\/plugins/u);
});
