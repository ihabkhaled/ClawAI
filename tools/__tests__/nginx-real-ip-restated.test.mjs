import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';
import { URL } from 'node:url';

/**
 * Regression: every service's throttler keys anonymous traffic on X-Real-IP
 * (packages/shared-auth/src/throttle). A location that declares ANY
 * proxy_set_header stops inheriting the server-level ones, so the SSE,
 * inference, webhook and frontend blocks silently dropped X-Real-IP and every
 * visitor of those routes landed in nginx's single bucket. Each such block must
 * restate it, and the server level must keep setting it from $remote_addr.
 */
const CONFIGS = [
  '../../infra/nginx/locations.conf',
  '../../infra/nginx/nginx.distributed.conf.template',
];
const REAL_IP = /proxy_set_header\s+X-Real-IP\s+\$remote_addr;/u;

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
  test(`${path}: a block with its own proxy_set_header restates X-Real-IP`, async () => {
    const text = await readFile(new URL(path, import.meta.url), 'utf8');
    for (const block of blocks(text)) {
      if (!block.lines.some((line) => /^\s*proxy_set_header\s/u.test(line))) continue;
      assert.ok(
        block.lines.some((line) => REAL_IP.test(line)),
        `block "${block.head}" sets its own headers but drops X-Real-IP`,
      );
    }
  });

  test(`${path}: X-Real-IP is only ever $remote_addr`, async () => {
    const text = await readFile(new URL(path, import.meta.url), 'utf8');
    const setters = text
      .split(/\r?\n/u)
      .filter((line) => /^\s*proxy_set_header\s+X-Real-IP\s/u.test(line));
    assert.ok(setters.length > 0, 'X-Real-IP must be set');
    for (const line of setters) assert.match(line, REAL_IP);
  });
}
