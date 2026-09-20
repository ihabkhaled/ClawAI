import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { test } from 'node:test';
import assert from 'node:assert/strict';

import { shardConfig, shardUrls } from '../../apps/claw-frontend/tools/lighthouse/shard-config.mjs';

// Lighthouse ran 115 URLs in one ~53 minute job. The workflow now builds once
// and audits in parallel shards. The one thing that must never happen is a URL
// falling out of every shard, which would silently drop its a11y/SEO gate.
const ROOT = join(import.meta.dirname, '..', '..');
const readJson = (path) => JSON.parse(readFileSync(join(ROOT, path), 'utf8'));
const WORKFLOW = readFileSync(join(ROOT, '.github', 'workflows', 'lighthouse.yml'), 'utf8');
const SHARDS = 20;

for (const file of ['lighthouserc.json', 'lighthouserc.pr.json']) {
  test(`every URL of ${file} is audited by exactly one shard`, () => {
    const urls = readJson(`apps/claw-frontend/${file}`).ci.collect.url;
    const shards = Array.from({ length: SHARDS }, (_, shard) => shardUrls(urls, shard, SHARDS));
    assert.deepEqual([...shards.flat()].sort(), [...urls].sort());
    const sizes = shards.map((shard) => shard.length);
    assert.ok(
      Math.max(...sizes) - Math.min(...sizes) <= 1,
      `unbalanced shards: ${sizes.join(',')}`,
    );
  });
}

test('a shard keeps every assertion and setting of the full config', () => {
  const config = readJson('apps/claw-frontend/lighthouserc.json');
  const shard = shardConfig(config, 3, SHARDS);
  assert.deepEqual(shard.ci.assert, config.ci.assert);
  assert.deepEqual({ ...shard.ci.collect, url: [] }, { ...config.ci.collect, url: [] });
  assert.deepEqual(shard.ci.upload, config.ci.upload);
});

test('an out-of-range shard is refused rather than auditing nothing', () => {
  assert.throws(() => shardUrls(['a'], SHARDS, SHARDS));
  assert.throws(() => shardUrls(['a'], -1, SHARDS));
  assert.throws(() => shardUrls(['a'], 0, 0));
});

test('the workflow runs as many shards as it divides the URLs into', () => {
  const matrix = /shard: \[([\d, ]+)\]/u.exec(WORKFLOW)?.[1] ?? '';
  const shards = matrix.split(',').map((value) => Number(value.trim()));
  assert.deepEqual(
    shards,
    Array.from({ length: SHARDS }, (_, index) => index),
  );
  assert.match(WORKFLOW, new RegExp(`LIGHTHOUSE_SHARDS: ${String(SHARDS)}`, 'u'));
  // The required check keeps its name and only goes green when every shard does.
  assert.match(WORKFLOW, /name: Lighthouse budgets \(marketing\)\r?\n\s+needs: audit/u);
  assert.match(WORKFLOW, /test "\$\{\{ needs\.audit\.result \}\}" = "success"/u);
});
