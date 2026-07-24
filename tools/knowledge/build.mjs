#!/usr/bin/env node
// Knowledge compiler — generates the committed `.ai/` knowledge layer from
// source. Deterministic: unchanged source ⇒ byte-identical output. Everything
// under `.ai/` EXCEPT `.ai/local/` is generated and committed; never hand-edit.
//
//   node tools/knowledge/build.mjs           → (re)generate .ai + workspace AGENTS.md
//   node tools/knowledge/build.mjs --check    → fail if any generated file is stale
import { mkdirSync, writeFileSync, rmSync, existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { buildManifests } from '../lib/manifests.mjs';
import { repoPath, isMain } from '../lib/repo.mjs';
import { stableStringify, hash, normalizeEol } from '../lib/fact.mjs';
import { renderBootstrap } from './render-bootstrap.mjs';
import { renderWorkspaceAgents } from './render-workspace-agents.mjs';
import { renderPacks } from './render-packs.mjs';

/** Compute every generated file as { relPath -> content } without writing. */
export function computeGeneratedFiles() {
  const manifests = buildManifests();
  const files = {};

  for (const [name, data] of Object.entries(manifests)) {
    files[`.ai/manifests/${name}.json`] = stableStringify({ generated: true, ...data });
  }

  files['.ai/BOOTSTRAP.md'] = renderBootstrap(manifests);

  for (const [relPath, content] of Object.entries(renderWorkspaceAgents(manifests))) {
    files[relPath] = content;
  }

  for (const [relPath, content] of Object.entries(renderPacks())) {
    files[relPath] = content;
  }

  // Freshness manifest: hash of every OTHER generated file, so knowledge:check
  // can detect drift with a single comparison.
  const hashes = {};
  for (const [rel, content] of Object.entries(files)) hashes[rel] = hash(content);
  files['.ai/manifests/hashes.json'] = stableStringify({ generated: true, hashes });

  return files;
}

function writeAll(files) {
  // Clean generated .ai subdirs (NOT .ai/local) so removed files don't linger.
  for (const sub of ['.ai/manifests', '.ai/packs']) {
    const dir = repoPath(sub);
    if (existsSync(dir)) rmSync(dir, { recursive: true, force: true });
  }
  for (const [rel, content] of Object.entries(files)) {
    const abs = repoPath(rel);
    mkdirSync(join(abs, '..'), { recursive: true });
    writeFileSync(abs, content);
  }
}

function checkAll(files) {
  const stale = [];
  for (const [rel, content] of Object.entries(files)) {
    const abs = repoPath(rel);
    const existing = existsSync(abs) ? normalizeEol(readFileSync(abs, 'utf8')) : null;
    if (existing !== content) stale.push(rel);
  }
  return stale;
}

function main() {
  const check = process.argv.includes('--check');
  const files = computeGeneratedFiles();
  if (check) {
    const stale = checkAll(files);
    if (stale.length > 0) {
      console.error(`knowledge:check FAILED — ${stale.length} generated file(s) stale:`);
      for (const s of stale.slice(0, 20)) console.error(`  ${s}`);
      console.error('Run `npm run knowledge:build` and commit the result.');
      process.exit(1);
    }
    console.log(`knowledge:check OK — ${Object.keys(files).length} generated files current.`);
    return;
  }
  writeAll(files);
  console.log(`knowledge:build wrote ${Object.keys(files).length} generated files under .ai/ + workspace AGENTS.md.`);
}

if (isMain(import.meta.url)) main();
