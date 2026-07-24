#!/usr/bin/env node
// knowledge:verify — the freshness + integrity gate. Fails (exit 1) on:
//  - stale generated .ai files (source changed, not regenerated)
//  - broken internal markdown links in governance docs
//  - hook-bypass recommendations in canonical policy
//  - unresolved cross-source contradictions
// Runs the same authoritative extractors developers/CI use.
import { existsSync } from 'node:fs';
import { computeGeneratedFiles } from './build.mjs';
import { repoPath, readText, listFiles, walkFiles, toRel } from '../lib/repo.mjs';
import { readFileSync } from 'node:fs';
import {
  findContradictions,
  findBypassRecommendations,
} from '../lib/analyzers.mjs';
import { extractAll } from '../lib/extractors.mjs';
import { isMain } from '../lib/repo.mjs';

function checkFreshness() {
  const files = computeGeneratedFiles();
  const stale = [];
  for (const [rel, content] of Object.entries(files)) {
    const abs = repoPath(rel);
    const existing = existsSync(abs) ? readFileSync(abs, 'utf8') : null;
    if (existing !== content) stale.push(rel);
  }
  return stale.map((s) => `stale generated file: ${s} (run npm run knowledge:build)`);
}

function checkLinks() {
  const errors = [];
  const dirs = ['rules', 'skills', 'context', 'memory', 'agents'];
  const mdFiles = [];
  for (const d of dirs) {
    for (const f of listFiles(repoPath(d)).filter((x) => x.endsWith('.md'))) {
      mdFiles.push(`${d}/${f}`);
    }
  }
  for (const rel of ['CLAUDE.md', 'AGENTS.md']) {
    if (existsSync(repoPath(rel))) mdFiles.push(rel);
  }
  for (const rel of mdFiles) {
    const src = readText(repoPath(rel)) ?? '';
    // Only validate relative links to repo files (skip http, anchors, generated).
    for (const m of src.matchAll(/\]\((?!https?:|#)([^)]+)\)/g)) {
      let target = m[1].split('#')[0].trim();
      if (!target || target.startsWith('mailto:')) continue;
      const abs = target.startsWith('/')
        ? repoPath(target.slice(1))
        : repoPath(rel, '..', target);
      if (!existsSync(abs)) errors.push(`broken link in ${rel} → ${target}`);
    }
  }
  return errors;
}

function checkBypass() {
  return findBypassRecommendations().map((f) => f.message);
}

function checkContradictions() {
  const inv = extractAll();
  return findContradictions(inv)
    .filter((f) => f.severity === 'high')
    .map((f) => `contradiction (${f.severity}): ${f.message}`);
}

export function runVerify() {
  return {
    freshness: checkFreshness(),
    links: checkLinks(),
    bypass: checkBypass(),
    contradictions: checkContradictions(),
  };
}

function main() {
  const results = runVerify();
  const all = [
    ...results.freshness,
    ...results.links,
    ...results.bypass,
    ...results.contradictions,
  ];
  if (all.length > 0) {
    console.error(`knowledge:verify FAILED — ${all.length} issue(s):`);
    for (const e of all) console.error(`  ✖ ${e}`);
    process.exit(1);
  }
  console.log('knowledge:verify OK — generated files fresh, links valid, no hook-bypass, no high-severity contradictions.');
}

if (isMain(import.meta.url)) main();
