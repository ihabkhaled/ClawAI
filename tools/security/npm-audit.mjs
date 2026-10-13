#!/usr/bin/env node
// Production dependency audit (CI). Fails on any high or critical advisory in
// the production dependency tree that is not in tools/security/audit-allowlist.json.
// An allowlist entry needs a reason, a reviewer and an expiry; an expired entry
// fails the build, so an exception cannot quietly become permanent.
//
//   node tools/security/npm-audit.mjs
import { execFileSync } from 'node:child_process';

import { npmInvocation } from '../lib/npm.mjs';
import { isMain, readJson, repoPath } from '../lib/repo.mjs';

const BLOCKING = new Set(['high', 'critical']);

/** Advisories (GHSA id -> { severity, packages }) reported by `npm audit --json`. */
export function blockingAdvisories(report) {
  const advisories = new Map();
  for (const [name, vulnerability] of Object.entries(report.vulnerabilities ?? {})) {
    for (const via of vulnerability.via ?? []) {
      if (typeof via !== 'object' || !BLOCKING.has(via.severity)) continue;
      const id = /GHSA-[\w-]+/u.exec(via.url ?? '')?.[0] ?? `${name}:${via.title}`;
      const entry = advisories.get(id) ?? { severity: via.severity, title: via.title, packages: new Set() };
      entry.packages.add(name);
      advisories.set(id, entry);
    }
  }
  return advisories;
}

export function auditViolations(advisories, allowlist, today = new Date().toISOString().slice(0, 10)) {
  const errors = [];
  for (const [id, advisory] of advisories) {
    const allowed = allowlist[id];
    if (!allowed) {
      errors.push(`${id} (${advisory.severity}) ${advisory.title} in ${[...advisory.packages].join(', ')}`);
    } else if (allowed.expires < today) {
      errors.push(`${id}: allowlist entry expired on ${allowed.expires} — re-review it or fix the dependency`);
    }
  }
  for (const [id, allowed] of Object.entries(allowlist)) {
    if (!allowed.reason || !allowed.expires || !allowed.reviewedBy) {
      errors.push(`${id}: allowlist entry needs reason, reviewedBy and expires`);
    }
  }
  return errors;
}

function main() {
  const [command, args, options] = npmInvocation(['audit', '--omit=dev', '--json']);
  let stdout;
  try {
    stdout = execFileSync(command, args, { ...options, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
  } catch (error) {
    // npm audit exits non-zero whenever it finds anything; the JSON is still on stdout.
    if (typeof error.stdout !== 'string' || !error.stdout.trim().startsWith('{')) throw error;
    stdout = error.stdout;
  }
  const allowlist = readJson(repoPath('tools/security/audit-allowlist.json'))?.advisories ?? {};
  const advisories = blockingAdvisories(JSON.parse(stdout));
  const errors = auditViolations(advisories, allowlist);
  if (errors.length > 0) {
    console.error(`npm audit FAILED — ${errors.length} high/critical issue(s) in production dependencies:`);
    for (const error of errors) console.error(`  ✖ ${error}`);
    process.exit(1);
  }
  const allowed = [...advisories.keys()].filter((id) => allowlist[id]);
  console.log(
    `npm audit OK — no unreviewed high/critical advisory (${allowed.length} allowlisted: ${allowed.join(', ') || 'none'})`,
  );
}

if (isMain(import.meta.url)) main();
