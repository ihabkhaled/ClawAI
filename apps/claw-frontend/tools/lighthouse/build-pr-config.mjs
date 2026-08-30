#!/usr/bin/env node
// Derives the pull-request Lighthouse config from the full one.
//
// WHY THIS EXISTS
// ---------------
// `lighthouse-coverage.test.ts` ties the audited set to the indexable set in
// both directions, so every published page MUST be in `lighthouserc.json`. That
// is the right rule for `main` and an expensive one for a pull request: the run
// is linear in URL count at a measured ~13.9 s per audit with `numberOfRuns: 2`,
// so 128 URLs is ~59-77 minutes on every frontend PR — including a one-line
// change to a chat component, because the workflow's path filter is the whole
// workspace.
//
// It is also 4.6x the flake exposure. `categories:best-practices` is asserted at
// `minScore: 1`, so ONE bad audit out of 256 fails the run for everyone.
//
// So pull requests audit a representative sample and `main` audits everything.
// The sample is DERIVED rather than maintained: a second hand-written list would
// drift from the first, and the drift would be invisible until a page nobody
// audited shipped a contrast failure.
//
// THE SAMPLING RULE
// -----------------
// Group by the first path segment after the locale, keep at most two URLs per
// group. For a cluster that is the hub plus one child; for a standalone page it
// is the page itself. Every group stays represented, so a whole cluster can
// never fall out of the gate — which is the only property that matters here.

import { readFileSync, writeFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const FULL_CONFIG = resolve(HERE, '../../lighthouserc.json');
const PR_CONFIG = resolve(HERE, '../../lighthouserc.pr.json');

/** At most this many URLs per group. Two = a hub and one child. */
const MAX_PER_GROUP = 2;

/** The group a URL belongs to: its first path segment after the locale. */
export function groupOf(url) {
  const segments = new URL(url).pathname.split('/').filter(Boolean);
  // segments[0] is the locale prefix; segments[1] is the top-level page.
  return segments[1] ?? '';
}

export function sampleUrls(urls) {
  const seen = new Map();
  return urls.filter((url) => {
    const group = groupOf(url);
    const count = seen.get(group) ?? 0;
    if (count >= MAX_PER_GROUP) {
      return false;
    }
    seen.set(group, count + 1);
    return true;
  });
}

function main() {
  const config = JSON.parse(readFileSync(FULL_CONFIG, 'utf8'));
  const sampled = sampleUrls(config.ci.collect.url);
  const prConfig = {
    ...config,
    ci: { ...config.ci, collect: { ...config.ci.collect, url: sampled } },
  };
  writeFileSync(PR_CONFIG, `${JSON.stringify(prConfig, null, 2)}\n`, 'utf8');
  process.stdout.write(
    `lighthouserc.pr.json: ${String(sampled.length)} of ${String(config.ci.collect.url.length)} URLs\n`,
  );
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main();
}
