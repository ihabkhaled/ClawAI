import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';
import { URL } from 'node:url';

/**
 * Regression: X-Content-Type-Options arrived twice on every proxied response,
 * once from nginx and once from the service (helmet, download controllers).
 * nginx now drops the upstream copy and adds its own. A location that declares
 * its own add_header stops inheriting the outer ones, so each such block must
 * re-add nosniff or it would lose the header altogether.
 */
const CONFIGS = [
  '../../infra/nginx/nginx.conf',
  '../../infra/nginx/nginx.distributed.conf.template',
  '../../infra/nginx/locations.conf',
];
const NOSNIFF = /add_header\s+X-Content-Type-Options\s+"nosniff"\s+always;/u;

/** Every `{ ... }` block as its own text, excluding nested blocks' lines. */
function blocks(text) {
  const result = [];
  const stack = [];
  for (const line of text.split(/\r?\n/u)) {
    const code = line.replace(/#.*$/u, '');
    if (/\{\s*$/u.test(code)) stack.push({ head: code.trim(), lines: [] });
    else if (/^\s*\}/u.test(code)) result.push(stack.pop());
    else if (stack.length > 0) stack.at(-1).lines.push(code);
  }
  return result.filter(Boolean);
}

for (const path of CONFIGS) {
  test(`${path}: a block with its own add_header keeps exactly one nosniff`, async () => {
    const text = await readFile(new URL(path, import.meta.url), 'utf8');
    for (const block of blocks(text)) {
      const body = block.lines.join('\n');
      if (!/add_header\s/u.test(body)) continue;
      const count = block.lines.filter((line) => NOSNIFF.test(line)).length;
      assert.equal(count, 1, `block "${block.head}" must declare nosniff exactly once`);
    }
  });
}

for (const path of ['../../infra/nginx/nginx.conf', '../../infra/nginx/nginx.distributed.conf.template']) {
  test(`${path}: hides the upstream nosniff before adding its own`, async () => {
    const text = await readFile(new URL(path, import.meta.url), 'utf8');
    const hide = text.search(/^\s*proxy_hide_header\s+X-Content-Type-Options;/mu);
    const add = text.search(NOSNIFF);
    assert.ok(hide >= 0, 'proxy_hide_header X-Content-Type-Options is missing');
    assert.ok(hide < add, 'proxy_hide_header must come before the add_header');
  });
}
