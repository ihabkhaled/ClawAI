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
import { readFileSync, readdirSync } from 'node:fs';
import { normalizeEol } from '../lib/fact.mjs';
import { findContradictions, findBypassRecommendations } from '../lib/analyzers.mjs';
import { extractAll } from '../lib/extractors.mjs';
import { isMain, exists } from '../lib/repo.mjs';
import { TASK_PACKS } from './classify-task.mjs';

function checkFreshness() {
  const files = computeGeneratedFiles();
  const stale = [];
  for (const [rel, content] of Object.entries(files)) {
    const abs = repoPath(rel);
    const existing = existsSync(abs) ? normalizeEol(readFileSync(abs, 'utf8')) : null;
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
      const abs = target.startsWith('/') ? repoPath(target.slice(1)) : repoPath(rel, '..', target);
      if (!existsSync(abs)) errors.push(`broken link in ${rel} → ${target}`);
    }
  }
  return errors;
}

function checkBypass() {
  return findBypassRecommendations().map((f) => f.message);
}

// Every reviewer named by a task pack must have an agents/<role>.md file, and
// every canonical file the BOOTSTRAP/authority-hierarchy references must exist.
// This is the check that would have caught the frontend-architecture-reviewer /
// dependency-reviewer name drift.
function checkOrphans() {
  const errors = [];
  const reviewers = new Set();
  for (const p of TASK_PACKS) for (const r of p.reviewers) reviewers.add(r);
  for (const r of [...reviewers].sort()) {
    if (!exists(repoPath('agents', `${r}.md`))) {
      errors.push(`orphan reviewer: task pack references agents/${r}.md which does not exist`);
    }
  }
  for (const canonical of [
    'CLAUDE.md',
    'rules/00-non-negotiable-rules.md',
    'context/architecture-map.md',
    'context/stack-and-toolchain.md',
    'context/service-catalog.md',
  ]) {
    if (!exists(repoPath(canonical))) {
      errors.push(`missing canonical file referenced by authority hierarchy: ${canonical}`);
    }
  }
  return errors;
}

// Rule 33. Exported for the unit test and the CI-only `knowledge:coverage`
// script — deliberately NOT part of runVerify(), because the git hooks run
// knowledge:verify and hooks gate CODE. Documentation coverage is a CI concern;
// putting it in the commit path would slow every commit for a class of problem
// that never breaks a build.
//
// A rule or skill nobody can reach from an index does not exist in
// practice, and a service with no CLAUDE.md or service guide costs the next
// agent a full re-derivation. These are the mechanically checkable parts of
// "the knowledge layer stays discoverable and current".
//
// Two services are deliberately exempt: claw-frontend is not a backend service
// and is covered by the frontend rules and context maps, and claw-coding-agent
// is a git submodule that carries its own docs in its own repository.
const SERVICE_GUIDE_EXEMPT = new Set(['claw-frontend', 'claw-coding-agent']);

// The guide filenames drop the -service suffix, and one predates the rename.
const SERVICE_GUIDE_ALIASES = new Map([['file-generation', 'filegen']]);

function serviceGuideName(workspace) {
  const base = workspace.replace(/^claw-/, '').replace(/-service$/, '');
  return SERVICE_GUIDE_ALIASES.get(base) ?? base;
}

export function checkKnowledgeCoverage() {
  const errors = [];

  const indexText = (rel) => readText(repoPath(rel)) ?? '';
  const ruleIndexes = indexText('rules/README.md') + indexText('rules/00-master-rules.md');
  const skillIndexes = indexText('skills/00-index.md') + indexText('skills/README.md');

  for (const file of listFiles(repoPath('rules')).filter((f) => /^\d{2}-.*\.md$/.test(f))) {
    if (!ruleIndexes.includes(file)) {
      errors.push(
        `unindexed rule: rules/${file} is not referenced by rules/README.md or rules/00-master-rules.md (rule 33)`,
      );
    }
  }

  for (const file of listFiles(repoPath('skills')).filter((f) => f.endsWith('.md'))) {
    if (file === '00-index.md' || file === 'README.md') continue;
    if (!skillIndexes.includes(file)) {
      errors.push(
        `unindexed skill: skills/${file} is not referenced by skills/00-index.md (rule 33)`,
      );
    }
  }

  const workspaces = existsSync(repoPath('apps'))
    ? readdirSync(repoPath('apps'), { withFileTypes: true })
        .filter((entry) => entry.isDirectory())
        .map((entry) => entry.name)
        .sort()
    : [];
  for (const workspace of workspaces) {
    if (!workspace.startsWith('claw-')) continue;
    if (!exists(repoPath('apps', workspace, 'CLAUDE.md'))) {
      errors.push(`missing service memory: apps/${workspace}/CLAUDE.md (rule 33)`);
    }
    if (SERVICE_GUIDE_EXEMPT.has(workspace)) continue;
    const guide = `docs/04-backend/service-guide-${serviceGuideName(workspace)}.md`;
    if (!exists(repoPath(guide))) {
      errors.push(`missing service guide: ${guide} for apps/${workspace} (rule 33)`);
    }
  }

  return errors;
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
    orphans: checkOrphans(),
    contradictions: checkContradictions(),
  };
}

function main() {
  const results = runVerify();
  const all = [
    ...results.freshness,
    ...results.links,
    ...results.bypass,
    ...results.orphans,
    ...results.contradictions,
  ];
  if (all.length > 0) {
    console.error(`knowledge:verify FAILED — ${all.length} issue(s):`);
    for (const e of all) console.error(`  ✖ ${e}`);
    process.exit(1);
  }
  console.log(
    'knowledge:verify OK — generated files fresh, links valid, no orphan reviewers, no hook-bypass, no high-severity contradictions.',
  );
}

if (isMain(import.meta.url)) main();
