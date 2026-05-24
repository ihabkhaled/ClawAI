/**
 * PROCESS capability provider (Stream 12).
 *
 * Implements 4 operations:
 *   SPAWN  — start a non-shell binary (use TERMINAL.SPAWN for shell ops)
 *   KILL   — send a signal to a pid
 *   LIST   — enumerate live processes (cross-OS via tasklist / ps)
 *   INSPECT — fetch metadata for a single pid
 *
 * Process spawning here is structurally different from TERMINAL.SPAWN:
 * we do NOT pass through a shell. The binary path + args are validated
 * separately and exec'd directly. This is the safer path for invoking
 * known dev tools (npm, docker, python, etc.) without shell-injection
 * risk.
 *
 * Cross-OS: relies on `node:child_process` + native `tasklist` (Windows)
 * or `ps` (Unix). No third-party process libs to bundle.
 *
 * Risk note: KILL and SPAWN are IRREVERSIBLE in the general case
 * (signals can't be undone, spawned processes can be re-killed via a
 * follow-up KILL but that's a new approval).  noUndoReason is captured
 * accordingly.
 */

import { exec, spawn } from 'node:child_process';
import { isAbsolute, normalize } from 'node:path';
import { promisify } from 'node:util';

import { getPlatform } from '../../config/paths.js';
import { dep, osFamily, probeHealthy, whichBinary } from '../probe-helpers.js';

const execAsync = promisify(exec);

const PROCESS_SPAWN_DEFAULT_TIMEOUT_MS = 60_000;
const PROCESS_LIST_MAX_ENTRIES = 2_000;
const PROCESS_OUTPUT_CAP_BYTES = 64 * 1024;

export const processProvider = {
  async probe() {
    const isWin = getPlatform() === 'windows';
    const listerName = isWin ? 'tasklist' : 'ps';
    const listerInstalled = await whichBinary(listerName);
    const dependencies = [
      dep({
        name: listerName,
        installed: listerInstalled,
        required: true,
        fix: listerInstalled
          ? null
          : isWin
            ? 'tasklist ships with Windows — check %SystemRoot%\\System32\\tasklist.exe'
            : 'ps ships with every POSIX OS — check /bin/ps or /usr/bin/ps',
      }),
    ];
    return {
      class: 'PROCESS',
      healthy: probeHealthy(dependencies),
      dependencies,
      notes: `LIST/INSPECT via ${listerName} on ${osFamily()}`,
    };
  },
  async execute({ operation, target, payload }) {
    switch (operation) {
      case 'SPAWN':
        return spawnOp(target, payload);
      case 'KILL':
        return killOp(target, payload);
      case 'LIST':
        return listOp(target);
      case 'INSPECT':
        return inspectOp(target);
      default:
        throw new Error(`PROCESS provider received unsupported operation: ${operation}`);
    }
  },
};

async function spawnOp(target, payload) {
  const binary = validateBinaryPath(target?.binary);
  const args = validateArgs(target?.args);
  const cwd = typeof payload?.cwd === 'string' && payload.cwd.length > 0 ? payload.cwd : undefined;
  const timeoutMs =
    typeof payload?.timeoutMs === 'number' && payload.timeoutMs > 0
      ? payload.timeoutMs
      : PROCESS_SPAWN_DEFAULT_TIMEOUT_MS;
  const result = await runBinary(binary, args, { cwd, timeoutMs });
  return {
    output: result,
    noUndoReason: 'process_spawn_irreversible',
  };
}

async function killOp(target, payload) {
  const pid = validatePid(target?.pid);
  const signal = typeof payload?.signal === 'string' ? payload.signal : 'SIGTERM';
  if (!ALLOWED_SIGNALS.has(signal)) {
    throw new Error(`PROCESS.KILL: signal ${signal} not allowed`);
  }
  try {
    process.kill(pid, signal);
  } catch (error) {
    throw new Error(`PROCESS.KILL: ${error?.message ?? 'kill failed'}`);
  }
  return {
    output: { pid, signal, sentAt: Date.now() },
    noUndoReason: 'signal_delivery_irreversible',
  };
}

async function listOp(target) {
  const filterRegex = typeof target?.binaryNameRegex === 'string'
    ? safeRegex(target.binaryNameRegex)
    : null;
  const all = await listProcesses();
  const filtered = filterRegex === null
    ? all
    : all.filter((p) => filterRegex.test(p.name));
  const sliced = filtered.slice(0, PROCESS_LIST_MAX_ENTRIES);
  return {
    output: {
      count: sliced.length,
      truncated: filtered.length > PROCESS_LIST_MAX_ENTRIES,
      processes: sliced,
    },
    noUndoReason: 'read_only_no_state_change',
  };
}

async function inspectOp(target) {
  const pid = validatePid(target?.pid);
  const all = await listProcesses();
  const found = all.find((p) => p.pid === pid);
  if (found === undefined) {
    return {
      output: { pid, found: false },
      noUndoReason: 'read_only_no_state_change',
    };
  }
  return {
    output: { pid, found: true, ...found },
    noUndoReason: 'read_only_no_state_change',
  };
}

function validateBinaryPath(raw) {
  if (typeof raw !== 'string' || raw.length === 0) {
    throw new Error('PROCESS.SPAWN: target.binary is required');
  }
  if (raw.length > 4096) {
    throw new Error('PROCESS.SPAWN: target.binary exceeds max length');
  }
  if (!isAbsolute(raw)) {
    throw new Error('PROCESS.SPAWN: target.binary must be an absolute path');
  }
  const normalised = normalize(raw);
  if (normalised.includes('..')) {
    throw new Error('PROCESS.SPAWN: target.binary traversal segments rejected');
  }
  return normalised;
}

function validateArgs(raw) {
  if (raw === undefined) return [];
  if (!Array.isArray(raw)) {
    throw new Error('PROCESS.SPAWN: target.args must be an array of strings');
  }
  if (raw.length > 256) {
    throw new Error('PROCESS.SPAWN: target.args exceeds 256 entries');
  }
  for (const a of raw) {
    if (typeof a !== 'string') {
      throw new Error('PROCESS.SPAWN: every target.args entry must be a string');
    }
    if (a.length > 4096) {
      throw new Error('PROCESS.SPAWN: target.args entry exceeds max length');
    }
  }
  return raw;
}

function validatePid(raw) {
  if (typeof raw !== 'number' || !Number.isInteger(raw) || raw <= 0) {
    throw new Error('PROCESS: target.pid must be a positive integer');
  }
  return raw;
}

const ALLOWED_SIGNALS = new Set([
  'SIGTERM',
  'SIGINT',
  'SIGHUP',
  'SIGQUIT',
  'SIGKILL',
  'SIGUSR1',
  'SIGUSR2',
]);

function runBinary(binary, args, { cwd, timeoutMs }) {
  return new Promise((resolve) => {
    const child = spawn(binary, args, {
      cwd,
      windowsHide: true,
      shell: false,
    });
    let stdout = '';
    let stderr = '';
    let killed = false;
    const timer = setTimeout(() => {
      killed = true;
      child.kill('SIGTERM');
      setTimeout(() => {
        if (child.exitCode === null) child.kill('SIGKILL');
      }, 5_000);
    }, timeoutMs);
    child.stdout?.on('data', (chunk) => {
      if (stdout.length < PROCESS_OUTPUT_CAP_BYTES) {
        stdout += chunk.toString('utf8');
        if (stdout.length > PROCESS_OUTPUT_CAP_BYTES) {
          stdout = stdout.slice(0, PROCESS_OUTPUT_CAP_BYTES);
        }
      }
    });
    child.stderr?.on('data', (chunk) => {
      if (stderr.length < PROCESS_OUTPUT_CAP_BYTES / 2) {
        stderr += chunk.toString('utf8');
      }
    });
    child.on('error', () => {
      clearTimeout(timer);
      resolve({ stdout, stderr, exitCode: -1, timedOut: false, error: 'spawn_failed' });
    });
    child.on('exit', (code) => {
      clearTimeout(timer);
      resolve({
        stdout,
        stderr,
        exitCode: code ?? (killed ? -1 : 0),
        timedOut: killed,
        pid: child.pid ?? null,
      });
    });
  });
}

async function listProcesses() {
  if (getPlatform() === 'windows') {
    return listWindowsProcesses();
  }
  return listUnixProcesses();
}

async function listWindowsProcesses() {
  // tasklist /FO CSV /NH yields: "Image Name","PID","Session Name","Session#","Mem Usage"
  const { stdout } = await execAsync('tasklist /FO CSV /NH', { maxBuffer: 4 * 1024 * 1024 });
  const lines = stdout.split(/\r?\n/).filter((line) => line.length > 0);
  const out = [];
  for (const line of lines) {
    const cells = parseCsvLine(line);
    if (cells.length < 2) continue;
    const name = cells[0];
    const pid = Number.parseInt(cells[1], 10);
    if (!Number.isFinite(pid)) continue;
    out.push({ pid, name });
  }
  return out;
}

async function listUnixProcesses() {
  // ps -A -o pid=,comm=
  const { stdout } = await execAsync('ps -A -o pid=,comm=', { maxBuffer: 4 * 1024 * 1024 });
  const lines = stdout.split(/\r?\n/).filter((line) => line.length > 0);
  const out = [];
  for (const line of lines) {
    const trimmed = line.trim();
    const space = trimmed.indexOf(' ');
    if (space === -1) continue;
    const pid = Number.parseInt(trimmed.slice(0, space), 10);
    const name = trimmed.slice(space + 1).trim();
    if (!Number.isFinite(pid) || name.length === 0) continue;
    out.push({ pid, name });
  }
  return out;
}

function parseCsvLine(line) {
  const cells = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i += 1) {
    const ch = line[i];
    if (ch === '"') {
      inQuotes = !inQuotes;
      continue;
    }
    if (ch === ',' && !inQuotes) {
      cells.push(current);
      current = '';
      continue;
    }
    current += ch;
  }
  cells.push(current);
  return cells;
}

function safeRegex(pattern) {
  try {
    return new RegExp(pattern);
  } catch {
    return null;
  }
}
