#!/usr/bin/env node
// Writes one shard of a Lighthouse config, so the audit runs in parallel jobs.
//
// WHY THIS EXISTS
// ---------------
// The run is linear in URL count: about 13.9 s per audit with
// `numberOfRuns: 2`. With 115 URLs on `main` that was about 53 minutes in one
// job. The workflow now builds the frontend once and audits it in 10 jobs, each
// taking every tenth URL. Same URLs, same assertions, same settings; only
// the list is split.
//
// Round-robin rather than consecutive slices: the list is grouped by cluster,
// and clusters differ in page weight, so slices would give one shard all the
// heavy pages.
//
//   node tools/lighthouse/shard-config.mjs <config.json> <shard> <of> <out.json>
//
// Prints the shard's URL count; 0 means that shard has nothing to audit.

import { readFileSync, writeFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';

/** The URLs shard `shard` of `of` audits: every `of`-th, starting at `shard`. */
export function shardUrls(urls, shard, of) {
  if (!Number.isInteger(shard) || !Number.isInteger(of) || of < 1 || shard < 0 || shard >= of) {
    throw new Error(`invalid shard ${String(shard)}/${String(of)}`);
  }
  return urls.filter((_, index) => index % of === shard);
}

/** The config with only this shard's URLs; everything else unchanged. */
export function shardConfig(config, shard, of) {
  return {
    ...config,
    ci: {
      ...config.ci,
      collect: { ...config.ci.collect, url: shardUrls(config.ci.collect.url, shard, of) },
    },
  };
}

function main() {
  const [configPath, shard, of, outPath] = process.argv.slice(2);
  if (configPath === undefined || outPath === undefined) {
    throw new Error('usage: shard-config.mjs <config.json> <shard> <of> <out.json>');
  }
  const config = JSON.parse(readFileSync(configPath, 'utf8'));
  const sharded = shardConfig(config, Number(shard), Number(of));
  writeFileSync(outPath, `${JSON.stringify(sharded, null, 2)}\n`);
  process.stdout.write(`${String(sharded.ci.collect.url.length)}\n`);
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  main();
}
