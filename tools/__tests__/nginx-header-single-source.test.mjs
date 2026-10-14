import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';
import { URL } from 'node:url';

/**
 * Regression: X-Frame-Options and Referrer-Policy arrived twice in production,
 * once from nginx and once from Next.js (next.config.mjs). nginx is the single
 * source of truth: it drops the upstream copy before adding its own.
 */
const CONFIGS = [
  '../../infra/nginx/nginx.conf',
  '../../infra/nginx/nginx.distributed.conf.template',
];

for (const path of CONFIGS) {
  for (const header of ['X-Frame-Options', 'Referrer-Policy']) {
    test(`${path}: hides the upstream ${header} before adding its own`, async () => {
      const text = await readFile(new URL(path, import.meta.url), 'utf8');
      const hide = text.search(new RegExp(String.raw`^\s*proxy_hide_header\s+${header};`, 'mu'));
      const add = text.search(new RegExp(String.raw`^\s*add_header\s+${header}\s`, 'mu'));
      assert.ok(hide >= 0, `proxy_hide_header ${header} is missing`);
      assert.ok(add >= 0 && hide < add, 'proxy_hide_header must come before add_header');
    });
  }
}
