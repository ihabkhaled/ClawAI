#!/usr/bin/env node
// Fails when a SARIF directory (CodeQL `analyze` with `upload: never`) holds
// any result. GitHub's CodeQL default setup owns the alert dashboard for this
// repository; this gate makes the same findings block CI and the release.
// A finding dismissed there after review is listed, with its reason, in
// tools/security/codeql-accepted.json (rule + path) and does not fail.
//
//   node tools/security/sarif-gate.mjs <sarif-dir>
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

import { isMain, readJson, repoPath } from '../lib/repo.mjs';

/** Every result in a parsed SARIF log: `{ rule, path, text }`. */
export function sarifFindings(log) {
  const findings = [];
  for (const run of log.runs ?? []) {
    for (const result of run.results ?? []) {
      // CodeQL reports suppressed results too; a suppression is a reviewed decision.
      if ((result.suppressions ?? []).length > 0) continue;
      const location = result.locations?.[0]?.physicalLocation;
      const where = location
        ? `${location.artifactLocation?.uri ?? '?'}:${location.region?.startLine ?? '?'}`
        : '(no location)';
      findings.push({
        rule: result.ruleId ?? '(rule)',
        path: location?.artifactLocation?.uri ?? '',
        text: `${result.ruleId ?? '(rule)'}  ${where}  ${result.message?.text ?? ''}`.trim(),
      });
    }
  }
  return findings;
}

/** Split findings into blocking ones and ones accepted after review. */
export function partitionFindings(findings, accepted) {
  const isAccepted = (f) => accepted.some((a) => a.rule === f.rule && a.path === f.path);
  return { blocking: findings.filter((f) => !isAccepted(f)), known: findings.filter(isAccepted) };
}

function main() {
  const dir = process.argv[2];
  if (!dir) {
    console.error('usage: sarif-gate.mjs <sarif-dir>');
    process.exit(2);
  }
  const files = readdirSync(dir).filter((file) => file.endsWith('.sarif'));
  if (files.length === 0) {
    console.error(`sarif-gate: no .sarif file in ${dir} — the analysis did not produce results`);
    process.exit(1);
  }
  const accepted = readJson(repoPath('tools/security/codeql-accepted.json'))?.accepted ?? [];
  const all = files.flatMap((file) => sarifFindings(JSON.parse(readFileSync(join(dir, file), 'utf8'))));
  const { blocking, known } = partitionFindings(all, accepted);
  for (const finding of known) console.log(`  · accepted: ${finding.text}`);
  if (blocking.length > 0) {
    console.error(`CodeQL FAILED — ${blocking.length} finding(s):`);
    for (const finding of blocking) console.error(`  ✖ ${finding.text}`);
    process.exit(1);
  }
  console.log(`CodeQL OK — 0 new findings across ${files.length} SARIF file(s) (${known.length} accepted)`);
}

if (isMain(import.meta.url)) main();
