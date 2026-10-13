#!/usr/bin/env node
// ESLint warning ratchet. Errors always fail. Warnings are held to a committed
// per-file, per-rule baseline (tools/lint/warnings-baseline.json): any count
// above the baseline fails, so the existing backlog never blocks a change but
// nothing new can join it. The baseline itself may only shrink.
//
//   node tools/lint/ratchet.mjs check --workspace=<name>     (CI static job)
//   node tools/lint/ratchet.mjs check-baseline --base=<ref>  (CI: baseline never grows)
//   node tools/lint/ratchet.mjs baseline [--workspace=<name>] [--bootstrap]
//
// lint-staged already enforces --max-warnings 0 on every file a commit
// touches, so in practice the baseline only shrinks as files are edited.
import { execFileSync } from 'node:child_process';
import { writeFileSync } from 'node:fs';
import { relative } from 'node:path';

import { stableStringify } from '../lib/fact.mjs';
import { discoverWorkspaces, isMain, readJson, repoPath } from '../lib/repo.mjs';

const BASELINE_REL = 'tools/lint/warnings-baseline.json';
const ESLINT_BIN = repoPath('node_modules', 'eslint', 'bin', 'eslint.js');

/** `{ errors: [...], warnings: { file -> { rule -> count } } }` for one workspace. */
export function lintWorkspace(workspace) {
  let stdout;
  try {
    stdout = execFileSync(
      process.execPath,
      [
        ESLINT_BIN,
        'src/',
        '--format',
        'json',
        '--cache',
        '--cache-strategy',
        'content',
        '--cache-location',
        'node_modules/.cache/eslint/',
      ],
      { cwd: repoPath(workspace.dir), encoding: 'utf8', maxBuffer: 512 * 1024 * 1024 },
    );
  } catch (error) {
    // ESLint exits 1 when it reports an error; the JSON is still on stdout.
    if (typeof error.stdout !== 'string' || !error.stdout.trim().startsWith('[')) throw error;
    stdout = error.stdout;
  }
  return summarise(JSON.parse(stdout));
}

/** Reduce ESLint's JSON results to errors and per-file, per-rule warning counts. */
export function summarise(results) {
  const errors = [];
  const warnings = {};
  for (const result of results) {
    const file = relative(repoPath(), result.filePath).split('\\').join('/');
    for (const message of result.messages) {
      const rule = message.ruleId ?? '(parse)';
      if (message.severity === 2) {
        errors.push(`${file}:${message.line}:${message.column} ${rule} ${message.message}`);
        continue;
      }
      warnings[file] ??= {};
      warnings[file][rule] = (warnings[file][rule] ?? 0) + 1;
    }
  }
  return { errors, warnings };
}

/** Warnings above the baseline, as readable lines. */
export function excessWarnings(current, baseline) {
  const excess = [];
  for (const [file, rules] of Object.entries(current)) {
    for (const [rule, count] of Object.entries(rules)) {
      const allowed = baseline[file]?.[rule] ?? 0;
      if (count > allowed) excess.push(`${file}: ${rule} ${count} (baseline ${allowed})`);
    }
  }
  return excess.sort();
}

function readBaseline() {
  return readJson(repoPath(BASELINE_REL))?.warnings ?? {};
}

function writeBaseline(warnings) {
  writeFileSync(repoPath(BASELINE_REL), stableStringify({ warnings }));
}

function workspaceFiles(workspace, baseline) {
  return Object.keys(baseline).filter((file) => file.startsWith(`${workspace.dir}/`));
}

function flag(name) {
  return process.argv.find((a) => a.startsWith(`--${name}=`))?.slice(name.length + 3);
}

function selectedWorkspaces() {
  const name = flag('workspace');
  const all = discoverWorkspaces().filter((ws) => ws.pkg.scripts?.lint);
  if (!name) return all;
  const match = all.filter((ws) => ws.name === name);
  if (match.length === 0) throw new Error(`no lintable workspace named ${name}`);
  return match;
}

function check() {
  const baseline = readBaseline();
  let failed = false;
  for (const workspace of selectedWorkspaces()) {
    const { errors, warnings } = lintWorkspace(workspace);
    const excess = excessWarnings(warnings, baseline);
    const total = Object.values(warnings).flatMap(Object.values).reduce((n, c) => n + c, 0);
    console.log(`${workspace.name}: ${errors.length} error(s), ${total} warning(s) within baseline`);
    for (const error of errors) console.error(`  ✖ ${error}`);
    for (const line of excess) console.error(`  ✖ new warning above baseline — ${line}`);
    // Baseline entries the workspace no longer needs: the backlog shrank.
    const recorded = Object.fromEntries(workspaceFiles(workspace, baseline).map((file) => [file, baseline[file]]));
    const shrunk = excessWarnings(recorded, warnings).length;
    if (shrunk > 0) {
      console.log(`  ↓ ${shrunk} baseline entr(ies) now above the real count — run \`npm run lint:baseline\` to lock it in`);
    }
    failed ||= errors.length > 0 || excess.length > 0;
  }
  if (failed) process.exit(1);
}

function checkBaseline(ref) {
  let previous = {};
  try {
    previous =
      JSON.parse(
        execFileSync('git', ['show', `${ref}:${BASELINE_REL}`], {
          encoding: 'utf8',
          stdio: ['ignore', 'pipe', 'pipe'],
        }),
      ).warnings ?? {};
  } catch {
    // The baseline does not exist on the base yet (the change introducing it).
    console.log(`lint baseline: none at ${ref}; nothing to compare`);
    return;
  }
  const growth = excessWarnings(readBaseline(), previous);
  if (growth.length > 0) {
    console.error(`lint baseline FAILED — it grew against ${ref}:`);
    for (const line of growth) console.error(`  ✖ ${line}`);
    process.exit(1);
  }
  console.log(`lint baseline OK — no entry grew against ${ref}`);
}

function baseline(bootstrap) {
  const existing = readBaseline();
  const next = { ...existing };
  let refused = 0;
  for (const workspace of selectedWorkspaces()) {
    for (const file of workspaceFiles(workspace, existing)) delete next[file];
    const { warnings } = lintWorkspace(workspace);
    for (const [file, rules] of Object.entries(warnings)) {
      for (const [rule, count] of Object.entries(rules)) {
        const allowed = existing[file]?.[rule];
        if (!bootstrap && (allowed === undefined || count > allowed)) {
          console.error(`  ✖ refusing to add ${file}: ${rule} ${count} (baseline ${allowed ?? 0}) — fix it`);
          refused += 1;
          continue;
        }
        next[file] ??= {};
        next[file][rule] = count;
      }
    }
    console.log(`${workspace.name}: baseline refreshed`);
  }
  if (refused > 0) process.exit(1);
  writeBaseline(next);
}

function main() {
  const [command = 'check'] = process.argv.slice(2).filter((a) => !a.startsWith('--'));
  if (command === 'check') return check();
  if (command === 'check-baseline') return checkBaseline(flag('base') ?? 'origin/main');
  if (command === 'baseline') return baseline(process.argv.includes('--bootstrap'));
  console.error('usage: ratchet.mjs <check|check-baseline|baseline> [--workspace=<name>] [--base=<ref>]');
  process.exit(2);
}

if (isMain(import.meta.url)) main();
