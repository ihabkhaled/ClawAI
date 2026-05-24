/**
 * TERMINAL capability provider (Stream 10 stub).
 *
 * The new pipeline can carry a TERMINAL/SPAWN invocation; this stub
 * routes it through the same shell-spawn primitives the legacy
 * /agent/commands flow uses. It does NOT yet stream stdout via SSE or
 * support live cancel — the legacy /agent/commands/:id/chunks path
 * remains the place for live shell output during the dual-write
 * window.
 *
 * Output shape: `{ output: { stdout, stderr, exitCode }, undoPlan }`.
 * Shell commands are IRREVERSIBLE — no undoPlan, only `noUndoReason`.
 */

import { spawn } from 'node:child_process';

import { getPlatform } from '../../config/paths.js';
import { dep, osFamily, probeHealthy, whichBinary } from '../probe-helpers.js';

const DEFAULT_TIMEOUT_MS = 300_000;
const STDOUT_MAX_BYTES = 64 * 1024;
const STDERR_MAX_BYTES = 32 * 1024;

function getShell() {
  return getPlatform() === 'windows'
    ? { cmd: 'cmd.exe', args: ['/d', '/s', '/c'] }
    : { cmd: '/bin/sh', args: ['-c'] };
}

export const terminalProvider = {
  async probe() {
    const shell = getPlatform() === 'windows' ? 'cmd.exe' : '/bin/sh';
    const present = await whichBinary(shell);
    const dependencies = [
      dep({
        name: shell,
        installed: present,
        required: true,
        fix: present ? null : `Shell ${shell} not found on PATH — verify your OS install`,
      }),
    ];
    return {
      class: 'TERMINAL',
      healthy: probeHealthy(dependencies),
      dependencies,
      notes: `OS family detected: ${osFamily()}`,
    };
  },
  async execute({ operation, target, payload }) {
    if (operation !== 'SPAWN') {
      throw new Error(`TERMINAL provider received unsupported operation: ${operation}`);
    }
    const command = target?.command;
    if (typeof command !== 'string' || command.length === 0) {
      throw new Error('TERMINAL.SPAWN target.command is required');
    }
    const workingDir = typeof payload?.workingDir === 'string' ? payload.workingDir : undefined;
    const timeoutMs = typeof payload?.timeoutMs === 'number' && payload.timeoutMs > 0
      ? payload.timeoutMs
      : DEFAULT_TIMEOUT_MS;
    const result = await runCommand(command, { workingDir, timeoutMs });
    return {
      output: result,
      noUndoReason: 'shell_command_irreversible',
    };
  },
};

function runCommand(command, { workingDir, timeoutMs }) {
  return new Promise((resolve) => {
    const shell = getShell();
    const child = spawn(shell.cmd, [...shell.args, command], {
      cwd: workingDir,
      windowsHide: true,
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
      if (stdout.length < STDOUT_MAX_BYTES) {
        stdout += chunk.toString('utf8');
        if (stdout.length > STDOUT_MAX_BYTES) stdout = stdout.slice(0, STDOUT_MAX_BYTES);
      }
    });
    child.stderr?.on('data', (chunk) => {
      if (stderr.length < STDERR_MAX_BYTES) {
        stderr += chunk.toString('utf8');
        if (stderr.length > STDERR_MAX_BYTES) stderr = stderr.slice(0, STDERR_MAX_BYTES);
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
      });
    });
  });
}
