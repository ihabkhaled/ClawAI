#!/usr/bin/env node
// One-off local measurement: run every workspace suite with coverage (in the
// bounded pool the gates use) and report pass/fail plus the coverage summary
// against the workspace's own thresholds. CI is the authority; this exists so
// a threshold change can be checked before a push.
//
//   node tools/coverage/measure.mjs [workspace…]
import { readFileSync } from 'node:fs';

import { testConcurrency } from '../affected/index.mjs';
import { formatSummary, runPool } from '../affected/pool.mjs';
import { discoverWorkspaces, isMain, repoPath } from '../lib/repo.mjs';
import { npmInvocation } from '../lib/npm.mjs';
import { configThresholds, METRICS } from './thresholds.mjs';

function summaryOf(dir) {
  try {
    return JSON.parse(readFileSync(repoPath(dir, 'coverage', 'coverage-summary.json'), 'utf8')).total;
  } catch {
    return null;
  }
}

async function main() {
  const only = new Set(process.argv.slice(2));
  const { suites, workersPerSuite } = testConcurrency();
  const workspaces = discoverWorkspaces().filter(
    (ws) => ws.pkg.scripts?.test && (only.size === 0 || only.has(ws.name)),
  );
  const tasks = workspaces.map((ws) => {
    const [command, args, options] = npmInvocation([
      'run',
      'test',
      '--workspace',
      ws.name,
      '--',
      '--coverage',
      '--coverage.reporter=json-summary',
      '--coverage.reporter=text-summary',
      `--maxWorkers=${String(workersPerSuite)}`,
    ]);
    return { name: ws.name, command, args, options };
  });
  const results = await runPool(tasks, { jobs: suites, write: () => {} });
  process.stdout.write(formatSummary(results));
  const thresholds = configThresholds();
  for (const [index, ws] of workspaces.entries()) {
    const total = summaryOf(ws.dir);
    const cells = METRICS.map((m) => `${m} ${total?.[m]?.pct ?? '?'}/${thresholds[ws.name]?.[m] ?? '-'}`);
    console.log(`${results[index].ok ? 'PASS' : 'FAIL'} ${ws.name}: ${cells.join('  ')}`);
    if (!results[index].ok) {
      const tail = results[index].output.split('\n').filter((l) => /threshold|ERROR|FAIL/u.test(l));
      for (const line of tail.slice(0, 6)) console.log(`     ${line.trim()}`);
    }
  }
}

if (isMain(import.meta.url)) main();
