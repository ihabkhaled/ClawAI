#!/usr/bin/env node
// Release preflight — runs the full release gate in dependency order and stops
// at the first meaningful failure, printing the exact failing command. This is
// the ONE place that intentionally validates broadly (a release, not a PR).
import { execSync } from 'node:child_process';
import { isMain } from '../lib/repo.mjs';
import { runWorkspaceGate } from './workspace-gate.mjs';

const STEPS = [
  { label: 'Toolchain', command: 'node --version' },
  { label: 'Audit freshness', command: 'npm run audit:check' },
  { label: 'Knowledge freshness', command: 'npm run knowledge:check' },
  {
    label: 'Knowledge integrity (links, bypass, contradictions)',
    command: 'npm run knowledge:verify',
  },
  { label: 'Knowledge tooling tests', command: 'npm run knowledge:test' },
  { label: 'Format check', command: 'npm run format:check' },
  { label: 'Lint (all workspaces, sequential)', workspaceScript: 'lint' },
  { label: 'Typecheck (all workspaces, sequential)', workspaceScript: 'typecheck' },
  { label: 'Tests (all workspaces, sequential)', workspaceScript: 'test' },
  { label: 'Build (all workspaces, sequential)', workspaceScript: 'build' },
];

export function runPreflight({
  args = process.argv.slice(2),
  runCommand = (command) => execSync(command, { stdio: 'inherit' }),
  runWorkspace = runWorkspaceGate,
  write = (message) => process.stdout.write(message),
  writeError = (message) => process.stderr.write(`${message}\n`),
} = {}) {
  const failFast = !args.includes('--continue');
  const failures = [];
  for (const step of STEPS) {
    const command = step.command ?? `npm run ${step.workspaceScript} (one workspace at a time)`;
    write(`\n▶ ${step.label}: ${command}\n`);
    try {
      if (step.workspaceScript) runWorkspace(step.workspaceScript);
      else runCommand(step.command);
      write(`✔ ${step.label}\n`);
    } catch (error) {
      const detail = error instanceof Error ? ` — ${error.message}` : '';
      writeError(`✖ ${step.label} FAILED — command: ${command}${detail}`);
      failures.push({ label: step.label, command });
      if (failFast) {
        writeError('\nrelease:preflight ABORTED at first failure.');
        return false;
      }
    }
  }
  if (failures.length > 0) {
    writeError(`\nrelease:preflight FAILED — ${failures.length} step(s):`);
    for (const failure of failures) writeError(`  ✖ ${failure.label}: ${failure.command}`);
    return false;
  }
  write('\nrelease:preflight OK — all gates green.\n');
  return true;
}

if (isMain(import.meta.url) && !runPreflight()) process.exitCode = 1;
