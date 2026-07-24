#!/usr/bin/env node
// Release preflight — runs the full release gate in dependency order and stops
// at the first meaningful failure, printing the exact failing command. This is
// the ONE place that intentionally validates broadly (a release, not a PR).
import { execSync } from 'node:child_process';
import { isMain } from '../lib/repo.mjs';

const STEPS = [
  ['Toolchain', 'node --version'],
  ['Audit freshness', 'npm run audit:check'],
  ['Knowledge freshness', 'npm run knowledge:check'],
  ['Knowledge integrity (links, bypass, contradictions)', 'npm run knowledge:verify'],
  ['Knowledge tooling tests', 'npm run knowledge:test'],
  ['Format check', 'npm run format:check'],
  ['Lint (all workspaces)', 'npm run lint'],
  ['Typecheck (all workspaces)', 'npm run typecheck'],
  ['Tests (all workspaces)', 'npm run test'],
  ['Build (all workspaces)', 'npm run build'],
];

function main() {
  const failFast = !process.argv.includes('--continue');
  const failures = [];
  for (const [label, cmd] of STEPS) {
    process.stdout.write(`\n▶ ${label}: ${cmd}\n`);
    try {
      execSync(cmd, { stdio: 'inherit' });
      console.log(`✔ ${label}`);
    } catch {
      console.error(`✖ ${label} FAILED — command: ${cmd}`);
      failures.push({ label, cmd });
      if (failFast) {
        console.error('\nrelease:preflight ABORTED at first failure.');
        process.exit(1);
      }
    }
  }
  if (failures.length > 0) {
    console.error(`\nrelease:preflight FAILED — ${failures.length} step(s):`);
    for (const f of failures) console.error(`  ✖ ${f.label}: ${f.cmd}`);
    process.exit(1);
  }
  console.log('\nrelease:preflight OK — all gates green.');
}

if (isMain(import.meta.url)) main();
