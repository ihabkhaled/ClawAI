/**
 * V2 Stream 02 — shared helpers for `claw-agent doctor` provider probes.
 *
 * Each provider exports a `probe()` returning a `ProviderProbeResult`
 * (see `agent-cli/src/types/probe.types.js` style — JSDoc only since
 * this codebase is JS). Result shape:
 *
 *   {
 *     class:       'TERMINAL' | 'FILESYSTEM' | ...,
 *     healthy:     boolean,        // all required dependencies satisfied
 *     dependencies: [
 *       { name: 'tesseract',  installed: false, fix: 'brew install tesseract', required: true },
 *       ...
 *     ],
 *     notes?:      string,         // free-text caveat (e.g. "Wayland clipboard limited")
 *   }
 *
 * Helpers below cover the common probe primitives:
 *   - whichBinary(name) — does the binary resolve on $PATH?
 *   - canDynamicallyImport(moduleSpecifier) — can `import()` resolve the module?
 *   - osFamily() — 'windows' | 'macos' | 'linux'
 *   - readBinaryVersion(name, args) — capture --version output
 */

import { exec } from 'node:child_process';
import { promisify } from 'node:util';

import { getPlatform } from '../config/paths.js';

const execAsync = promisify(exec);

/**
 * Returns true if the named binary can be located on PATH.
 * On Windows uses `where`, on POSIX uses `command -v`.
 */
export async function whichBinary(name) {
  const cmd = getPlatform() === 'windows' ? `where ${name}` : `command -v ${name}`;
  try {
    const { stdout } = await execAsync(cmd, { timeout: 3_000 });
    return stdout.trim().length > 0;
  } catch {
    return false;
  }
}

/**
 * Returns the captured `--version` (or supplied args) output, trimmed to
 * the first line, or null if the binary doesn't exist / fails.
 */
export async function readBinaryVersion(name, args = '--version') {
  try {
    const { stdout } = await execAsync(`${name} ${args}`, { timeout: 3_000 });
    return stdout.split('\n')[0]?.trim() ?? null;
  } catch {
    return null;
  }
}

/**
 * Returns true if `import(moduleSpecifier)` resolves. Used to probe
 * lazy-imported npm packages (playwright, @nut-tree-fork/nut-js, etc.)
 * without paying their cold-start cost.
 */
export async function canDynamicallyImport(moduleSpecifier) {
  try {
    await import(moduleSpecifier);
    return true;
  } catch {
    return false;
  }
}

/**
 * 'windows' | 'macos' | 'linux' — the OS family used by per-OS install
 * hint strings inside provider probes.
 */
export function osFamily() {
  const p = getPlatform();
  if (p === 'windows') return 'windows';
  if (p === 'macos') return 'macos';
  return 'linux';
}

/**
 * Convenience: build a "dependency installed" row for the probe result.
 */
export function dep({ name, installed, version = null, fix = null, required = true, notes = null }) {
  return { name, installed, version, fix, required, notes };
}

/**
 * Aggregate `dependencies[]` into a single `healthy` boolean by checking
 * that every `required: true` row is installed. Optional rows can be
 * absent without flipping the probe red.
 */
export function probeHealthy(dependencies) {
  return dependencies.every((d) => d.required === false || d.installed === true);
}
