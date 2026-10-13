// Spawning npm portably. On Windows `npm` is `npm.cmd`, and Node refuses to
// spawn a .cmd without `shell: true` (CVE-2024-27980), which in turn concatenates
// arguments unescaped (DEP0190). Running npm's own JS entry point with the
// current Node binary needs no shell on any platform.
import { existsSync } from 'node:fs';
import { dirname, join } from 'node:path';

function npmCliPath() {
  const candidates = [
    process.env.npm_execpath,
    join(dirname(process.execPath), 'node_modules', 'npm', 'bin', 'npm-cli.js'),
    join(dirname(process.execPath), '..', 'lib', 'node_modules', 'npm', 'bin', 'npm-cli.js'),
  ];
  return candidates.find((path) => path && path.endsWith('.js') && existsSync(path)) ?? null;
}

/**
 * `[command, args, options]` for spawning `npm <args>`. Falls back to the npm
 * shim (with a shell on Windows) only when npm's entry point cannot be found.
 */
export function npmInvocation(args) {
  const cli = npmCliPath();
  if (cli !== null) return [process.execPath, [cli, ...args], {}];
  const isWindows = process.platform === 'win32';
  return [isWindows ? 'npm.cmd' : 'npm', args, { shell: isWindows }];
}
