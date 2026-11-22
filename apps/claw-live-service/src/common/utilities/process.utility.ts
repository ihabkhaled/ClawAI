import { type ChildProcess, spawn } from 'node:child_process';

import { PROCESS_STDERR_TAIL_BYTES } from './process.constants';
import type { BoundedProcessOptions, BoundedProcessResult } from './process.types';

/** Why a bounded child process produced no usable output. A code, never its stderr. */
export class BoundedProcessError extends Error {
  constructor(readonly code: string) {
    super(code);
  }
}

/** Spawns `command` without a shell (arguments are never interpolated into a command line). */
export function spawnProcess(command: string, args: readonly string[]): ChildProcess {
  return spawn(command, [...args], {
    shell: false,
    windowsHide: true,
    stdio: ['ignore', 'pipe', 'pipe'],
  });
}

/**
 * Runs a child to completion with a timeout and a stdout cap (live-service CLAUDE.md:
 * ffmpeg only through a bounded wrapper). Resolves with the exit code; rejects with a
 * BoundedProcessError on spawn failure, timeout or oversized output.
 */
export function runBoundedProcess(
  command: string,
  args: readonly string[],
  options: BoundedProcessOptions,
): Promise<BoundedProcessResult> {
  return new Promise((resolve, reject) => {
    const child = spawnProcess(command, args);
    const chunks: Buffer[] = [];
    let size = 0;
    let stderrTail = '';
    let settled = false;
    const finish = (error: BoundedProcessError | null, exitCode: number | null = null): void => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      if (error) {
        child.kill('SIGKILL');
        reject(error);
        return;
      }
      resolve({ exitCode, stdout: Buffer.concat(chunks), stderrTail });
    };
    const timer = setTimeout(
      () => finish(new BoundedProcessError('PROCESS_TIMEOUT')),
      options.timeoutMs,
    );
    child.stdout?.on('data', (chunk: Buffer) => {
      size += chunk.length;
      if (size > options.maxOutputBytes) {
        finish(new BoundedProcessError('PROCESS_OUTPUT_TOO_LARGE'));
        return;
      }
      chunks.push(chunk);
    });
    child.stderr?.on('data', (chunk: Buffer) => {
      stderrTail = `${stderrTail}${chunk.toString('utf8')}`.slice(-PROCESS_STDERR_TAIL_BYTES);
    });
    child.on('error', () => finish(new BoundedProcessError('PROCESS_SPAWN_FAILED')));
    child.on('close', (code) => finish(null, code));
  });
}
