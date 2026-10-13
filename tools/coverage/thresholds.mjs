#!/usr/bin/env node
// Coverage ratchet. Two numbers per workspace and metric, both recorded in
// tools/coverage/thresholds.json, both only ever going up:
//
//   declared  the workspace vitest config's `coverage.thresholds` — the
//             target. Never lowered.
//   floor     what CI enforces: the declared value once the suite meets it,
//             otherwise the coverage the suite measured when the floor was
//             set. A floor never exceeds its declared value.
//
// Until 2026-10-13 CI never ran `--coverage`, so the declared thresholds were
// never enforced and 17 of 27 suites sit below their own. Enforcing them
// outright would fail every change to those workspaces; lowering them is
// prohibited. The floor makes coverage unable to drop while the gap closes on
// the dated path in rules/22.
//
//   node tools/coverage/thresholds.mjs check [--base=<ref>]  # CI: nothing went down
//   node tools/coverage/thresholds.mjs flags <workspace>    # vitest CLI flags enforcing the floor
//   node tools/coverage/thresholds.mjs sync                  # record declared values (never lowers)
//   node tools/coverage/thresholds.mjs raise-floors          # raise floors from coverage/coverage-summary.json
import { execFileSync } from 'node:child_process';
import { writeFileSync } from 'node:fs';

import { stableStringify } from '../lib/fact.mjs';
import { discoverWorkspaces, isMain, readJson, readText, repoPath } from '../lib/repo.mjs';

export const METRICS = ['branches', 'functions', 'lines', 'statements'];
const TABLE_REL = 'tools/coverage/thresholds.json';
const CONFIG_NAMES = ['vitest.config.ts', 'vitest.config.mts'];
// New and changed lines in a PR must meet this on their own (changed-lines.mjs).
const DEFAULT_CHANGED_LINES = 80;

/** Thresholds declared in a vitest config's `coverage.thresholds` block, or null. */
export function parseThresholds(source) {
  const block = /thresholds\s*:\s*\{([^}]*)\}/u.exec(source ?? '');
  if (!block) return null;
  const values = {};
  for (const metric of METRICS) {
    const match = new RegExp(`["']?${metric}["']?\\s*:\\s*(\\d+(?:\\.\\d+)?)`, 'u').exec(block[1]);
    if (match) values[metric] = Number(match[1]);
  }
  return METRICS.every((metric) => metric in values) ? values : null;
}

/** { workspace -> thresholds } from every workspace vitest config. */
export function configThresholds(workspaces = discoverWorkspaces()) {
  const out = {};
  for (const ws of workspaces) {
    for (const name of CONFIG_NAMES) {
      const source = readText(repoPath(ws.dir, name));
      if (source === null) continue;
      const parsed = parseThresholds(source);
      if (parsed) out[ws.name] = parsed;
      break;
    }
  }
  return out;
}

function emptyTable() {
  return { changedLines: DEFAULT_CHANGED_LINES, workspaces: {}, floors: {} };
}

export function readTable(raw) {
  return { ...emptyTable(), ...(raw ?? {}) };
}

function lowered(label, current = {}, previous = {}) {
  const errors = [];
  for (const [workspace, before] of Object.entries(previous)) {
    const now = current[workspace];
    if (!now) {
      errors.push(`${workspace}: ${label} removed from ${TABLE_REL}; coverage can only go up`);
      continue;
    }
    for (const metric of METRICS) {
      if (now[metric] < before[metric]) {
        errors.push(`${workspace}: ${label} ${metric} lowered from ${before[metric]} to ${now[metric]}`);
      }
    }
  }
  return errors;
}

/** Every way the recorded table, the configs and the base table can disagree. */
export function ratchetViolations(configs, table, base = null) {
  const errors = [];
  for (const [workspace, declared] of Object.entries(configs)) {
    const recorded = table.workspaces[workspace];
    const floor = table.floors[workspace];
    if (!recorded) errors.push(`${workspace}: declared thresholds missing from ${TABLE_REL} (run sync)`);
    if (!floor) errors.push(`${workspace}: enforced floor missing from ${TABLE_REL} (run raise-floors)`);
    for (const metric of METRICS) {
      if (recorded && declared[metric] < recorded[metric]) {
        errors.push(`${workspace}: vitest config ${metric} ${declared[metric]} is below the recorded ${recorded[metric]}`);
      }
      if (floor && floor[metric] > declared[metric]) {
        errors.push(`${workspace}: floor ${metric} ${floor[metric]} exceeds the declared ${declared[metric]}`);
      }
    }
  }
  for (const workspace of Object.keys(table.workspaces)) {
    if (!configs[workspace]) errors.push(`${workspace}: recorded in ${TABLE_REL} but its vitest config declares no thresholds`);
  }
  if (typeof table.changedLines !== 'number') errors.push(`${TABLE_REL}: changedLines target missing`);
  if (base) {
    errors.push(...lowered('declared', table.workspaces, base.workspaces));
    errors.push(...lowered('floor', table.floors, base.floors));
    if (typeof base.changedLines === 'number' && table.changedLines < base.changedLines) {
      errors.push(`${TABLE_REL}: changedLines lowered from ${base.changedLines} to ${table.changedLines}`);
    }
  }
  return errors;
}

/** vitest CLI flags that enforce a workspace's floor. */
export function thresholdFlags(floor) {
  return METRICS.map((metric) => `--coverage.thresholds.${metric}=${floor[metric]}`);
}

/**
 * Floors are measured locally and enforced on CI's Linux runners; a branch
 * that only runs on one platform can move a suite's numbers by a fraction of a
 * point. A floor below its target therefore sits this far under the measured
 * value. A suite that meets its target enforces the target exactly.
 */
const PLATFORM_MARGIN = 1;

/** New floors from measured coverage: up to the declared value, never down. */
export function raisedFloors(table, configs, measured) {
  const floors = { ...table.floors };
  for (const [workspace, declared] of Object.entries(configs)) {
    const total = measured[workspace];
    if (!total) continue;
    const previous = floors[workspace] ?? {};
    floors[workspace] = Object.fromEntries(
      METRICS.map((metric) => {
        const pct = total[metric]?.pct ?? 0;
        const reached = pct >= declared[metric] ? declared[metric] : Math.max(0, Math.floor(pct) - PLATFORM_MARGIN);
        return [metric, Math.max(previous[metric] ?? 0, reached)];
      }),
    );
  }
  return floors;
}

function tableAt(ref) {
  try {
    const raw = execFileSync('git', ['show', `${ref}:${TABLE_REL}`], {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    return readTable(JSON.parse(raw));
  } catch {
    // The table does not exist on the base yet (the change that introduces it).
    return null;
  }
}

function writeTable(table) {
  writeFileSync(repoPath(TABLE_REL), stableStringify(table));
}

function main() {
  const args = process.argv.slice(2);
  const [command = 'check', target] = args.filter((a) => !a.startsWith('--'));
  const baseArg = args.find((a) => a.startsWith('--base='))?.slice(7);
  const workspaces = discoverWorkspaces();
  const configs = configThresholds(workspaces);
  const table = readTable(readJson(repoPath(TABLE_REL)));

  if (command === 'flags') {
    const floor = table.floors[target];
    if (!floor) {
      console.error(`no enforced floor recorded for ${target} in ${TABLE_REL}`);
      process.exit(1);
    }
    process.stdout.write(thresholdFlags(floor).join(' '));
    return;
  }
  if (command === 'sync') {
    const declared = {};
    for (const [workspace, values] of Object.entries(configs)) {
      const recorded = table.workspaces[workspace] ?? {};
      declared[workspace] = Object.fromEntries(METRICS.map((m) => [m, Math.max(values[m], recorded[m] ?? 0)]));
    }
    writeTable({ ...table, workspaces: declared });
    console.log(`declared thresholds recorded for ${Object.keys(declared).length} workspaces`);
    return;
  }
  if (command === 'raise-floors') {
    const measured = {};
    for (const ws of workspaces) {
      const summary = readJson(repoPath(ws.dir, 'coverage', 'coverage-summary.json'));
      if (summary?.total) measured[ws.name] = summary.total;
    }
    writeTable({ ...table, floors: raisedFloors(table, configs, measured) });
    console.log(`floors raised from ${Object.keys(measured).length} coverage summaries (never lowered)`);
    return;
  }

  const errors = ratchetViolations(configs, table, baseArg ? tableAt(baseArg) : null);
  if (errors.length > 0) {
    console.error(`coverage thresholds FAILED — ${errors.length} issue(s):`);
    for (const error of errors) console.error(`  ✖ ${error}`);
    process.exit(1);
  }
  const atTarget = Object.keys(configs).filter((ws) =>
    METRICS.every((m) => table.floors[ws]?.[m] === configs[ws][m]),
  ).length;
  console.log(
    `coverage thresholds OK — ${Object.keys(configs).length} workspaces; ${atTarget} enforce their declared ` +
      `thresholds, the rest a floor that only rises`,
  );
}

if (isMain(import.meta.url)) main();
