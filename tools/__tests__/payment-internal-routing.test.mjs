import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';
import { URL } from 'node:url';

/**
 * The docker-mode routing table lives in infra/nginx/locations.conf, which
 * every TLS server block in nginx.conf `include`s — a production server serves
 * the same routes under both the mkcert and the Let's Encrypt certificate, and
 * one shared file is what stops those two copies drifting. Reading only
 * nginx.conf here would assert against a file that no longer holds any route,
 * so both are concatenated into the config the container effectively runs.
 */
async function readLocalNginxConfig() {
  const parts = await Promise.all([
    readFile(new URL('../../infra/nginx/nginx.conf', import.meta.url), 'utf8'),
    readFile(new URL('../../infra/nginx/locations.conf', import.meta.url), 'utf8'),
  ]);
  return parts.join('\n');
}

test('nginx does not expose the payment service internal API', async () => {
  const nginx = await readLocalNginxConfig();
  assert.doesNotMatch(nginx, /location\s+\/api\/v1\/internal\/payments(?:\s|\/|\{)/u);
});

test('both nginx deployment modes expose every public payment route', async () => {
  const configs = await Promise.all([
    readLocalNginxConfig(),
    readFile(new URL('../../infra/nginx/nginx.distributed.conf.template', import.meta.url), 'utf8'),
  ]);

  for (const nginx of configs) {
    assert.match(nginx, /location\s+\/api\/v1\/payments\/webhooks\s*\{/u);
    assert.match(nginx, /location\s+\/api\/v1\/payments\s*\{/u);
    assert.match(nginx, /location\s+\/api\/v1\/billing\s*\{/u);
    assert.match(nginx, /location\s+\/api\/v1\/admin\/billing\s*\{/u);
    assert.match(nginx, /location\s+\/api\/v1\/admin\/payment-gateways\s*\{/u);
    assert.doesNotMatch(nginx, /location\s+\/api\/v1\/internal\/payments(?:\s|\/|\{)/u);
  }
});

test('local payment write limiting excludes safe billing reads', async () => {
  const nginx = await readFile(new URL('../../infra/nginx/nginx.conf', import.meta.url), 'utf8');

  assert.match(nginx, /map\s+\$request_method\s+\$payment_write_key\s*\{/u);
  assert.match(nginx, /GET\s+"";/u);
  assert.match(nginx, /HEAD\s+"";/u);
  assert.match(nginx, /OPTIONS\s+"";/u);
  assert.match(
    nginx,
    /limit_req_zone\s+\$payment_write_key\s+zone=payment_writes:10m\s+rate=20r\/m;/u,
  );
  assert.doesNotMatch(nginx, /limit_req_zone\s+\$binary_remote_addr\s+zone=payment_writes/u);
});
