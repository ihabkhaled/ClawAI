#!/usr/bin/env node
import { execFileSync } from 'node:child_process';

import { discoverWorkspaces, isMain } from '../lib/repo.mjs';

const IS_WINDOWS = process.platform === 'win32';
const NPM = IS_WINDOWS ? 'npm.cmd' : 'npm';

function executeWorkspace(name, script, scriptArguments) {
  const forwardedArguments = scriptArguments.length > 0 ? ['--', ...scriptArguments] : [];
  execFileSync(NPM, ['run', script, '--workspace', name, ...forwardedArguments], {
    stdio: 'inherit',
    shell: IS_WINDOWS,
  });
}

export function runWorkspaceGate(
  script,
  {
    workspaces = discoverWorkspaces(),
    execute = executeWorkspace,
    write = (message) => process.stdout.write(message),
  } = {},
) {
  const runnable = workspaces.filter((workspace) => workspace.pkg.scripts?.[script] !== undefined);
  const scriptArguments = script === 'lint' ? ['--concurrency=1'] : [];
  for (const [index, workspace] of runnable.entries()) {
    write(`\n▶ [${script} ${index + 1}/${runnable.length}] ${workspace.name}\n`);
    try {
      execute(workspace.name, script, scriptArguments);
    } catch (error) {
      throw new Error(`${workspace.name} failed npm run ${script}`, { cause: error });
    }
  }
}

function main() {
  const [script] = process.argv.slice(2);
  if (!script) throw new Error('Usage: node tools/release/workspace-gate.mjs <script>');
  runWorkspaceGate(script);
}

if (isMain(import.meta.url)) main();
