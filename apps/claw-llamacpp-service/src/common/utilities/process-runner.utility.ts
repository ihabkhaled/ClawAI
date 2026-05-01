import { spawn, type ChildProcess, type SpawnOptions } from 'node:child_process';
import { Logger } from '@nestjs/common';
import { type ExecResult } from '../types/exec-result.type';

const logger = new Logger('ProcessRunner');

export async function execFileSafe(
  command: string,
  args: readonly string[],
  timeoutMs = 5000,
): Promise<ExecResult> {
  return new Promise((resolve) => {
    let stdout = '';
    let stderr = '';
    let resolved = false;

    let child: ChildProcess;
    try {
      child = spawn(command, [...args], { shell: false, stdio: ['ignore', 'pipe', 'pipe'] });
    } catch (error) {
      logger.warn(`execFileSafe: spawn failed for ${command} — ${(error as Error).message}`);
      resolve({ stdout: '', stderr: (error as Error).message, exitCode: -1, signal: null });
      return;
    }

    const timeout = setTimeout(() => {
      if (!resolved) {
        resolved = true;
        try {
          child.kill('SIGKILL');
        } catch {
          // already gone
        }
        resolve({ stdout, stderr: `${stderr}\n[timeout]`, exitCode: -1, signal: 'SIGKILL' });
      }
    }, timeoutMs);

    child.stdout?.on('data', (chunk: Buffer) => {
      stdout += chunk.toString('utf8');
    });
    child.stderr?.on('data', (chunk: Buffer) => {
      stderr += chunk.toString('utf8');
    });
    child.on('error', (error) => {
      if (!resolved) {
        resolved = true;
        clearTimeout(timeout);
        resolve({ stdout, stderr: `${stderr}\n${error.message}`, exitCode: -1, signal: null });
      }
    });
    child.on('close', (code, signal) => {
      if (!resolved) {
        resolved = true;
        clearTimeout(timeout);
        resolve({ stdout, stderr, exitCode: code, signal });
      }
    });
  });
}

export function spawnDetached(
  command: string,
  args: readonly string[],
  options: SpawnOptions = {},
): ChildProcess {
  return spawn(command, [...args], {
    ...options,
    shell: false,
    detached: false,
  });
}
