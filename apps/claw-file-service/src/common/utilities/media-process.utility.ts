import { type ChildProcess, spawn } from 'node:child_process';
import { mkdtemp, readFile, rm, stat, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { Logger } from '@nestjs/common';
import { MediaProcessStatus } from '../enums';
import { MEDIA_TEMP_DIR_PREFIX } from '../../modules/files/constants/video-processing.constants';
import {
  type MediaProcessRequest,
  type MediaProcessResult,
} from '../../modules/files/types/video-processing.types';

const logger = new Logger('MediaProcess');

// The ONLY file in file-service that touches `node:child_process` (rules/13).
// Copied from llamacpp-service's `execFileSafe`, tightened for untrusted input:
//
// 1. `spawn(command, argsArray, { shell: false })` — there is no shell, so a
//    `;`, `|` or `$()` anywhere in an argument is a literal byte, not syntax.
//    Callers never put user text in an argument anyway (see media-args.utility).
// 2. stdin is `ignore`: ffmpeg can never block waiting on the service's fd 0.
// 3. A hard wall-clock budget ends in SIGKILL, not SIGTERM — a decoder stuck
//    in a hostile container does not get to negotiate.
// 4. stdout is capped in BYTES and the process is killed the moment it passes
//    the cap; stderr keeps only its head, for a log line.
// 5. An optional AbortSignal (a user cancel) SIGKILLs the child and ends the
//    run `ABORTED`; an already-aborted signal never spawns. The listener is
//    removed when the run settles. The caller's temp dir is removed by its own
//    `finally` (`VideoMediaManager.withWorkspace`), exactly as on a timeout.

/** Runs one bounded ffprobe/ffmpeg process. Never throws; the status says how it ended. */
export async function runMediaProcess(request: MediaProcessRequest): Promise<MediaProcessResult> {
  const { signal } = request;
  if (signal?.aborted === true) {
    logger.warn(`runMediaProcess: ${request.command} not started — cancelled`);
    return {
      status: MediaProcessStatus.ABORTED,
      exitCode: null,
      stdout: Buffer.alloc(0),
      stderr: '',
    };
  }
  return new Promise((resolve) => {
    const stdoutChunks: Buffer[] = [];
    let stdoutBytes = 0;
    let stderr = '';
    let settled = false;

    let child: ChildProcess;
    try {
      child = spawn(request.command, [...request.args], {
        shell: false,
        stdio: ['ignore', 'pipe', 'pipe'],
        windowsHide: true,
      });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'spawn failed';
      logger.warn(`runMediaProcess: could not start ${request.command} — ${message}`);
      resolve({
        status: MediaProcessStatus.SPAWN_FAILED,
        exitCode: null,
        stdout: Buffer.alloc(0),
        stderr: message,
      });
      return;
    }

    const finish = (status: MediaProcessStatus, exitCode: number | null): void => {
      if (settled) {
        return;
      }
      settled = true;
      clearTimeout(timer);
      signal?.removeEventListener('abort', onAbort);
      resolve({ status, exitCode, stdout: Buffer.concat(stdoutChunks), stderr });
    };
    const kill = (): void => {
      try {
        child.kill('SIGKILL');
      } catch {
        // Already exited — nothing left to kill.
      }
    };

    const timer = setTimeout(() => {
      logger.warn(
        `runMediaProcess: ${request.command} exceeded ${String(request.timeoutMs)}ms — SIGKILL`,
      );
      kill();
      finish(MediaProcessStatus.TIMED_OUT, null);
    }, request.timeoutMs);

    const onAbort = (): void => {
      logger.warn(`runMediaProcess: ${request.command} cancelled — SIGKILL`);
      kill();
      finish(MediaProcessStatus.ABORTED, null);
    };
    signal?.addEventListener('abort', onAbort, { once: true });

    child.stdout?.on('data', (chunk: Buffer) => {
      stdoutBytes += chunk.length;
      if (stdoutBytes > request.maxStdoutBytes) {
        logger.warn(
          `runMediaProcess: ${request.command} stdout passed ${String(request.maxStdoutBytes)} bytes — SIGKILL`,
        );
        kill();
        finish(MediaProcessStatus.OUTPUT_LIMIT_EXCEEDED, null);
        return;
      }
      stdoutChunks.push(chunk);
    });
    child.stderr?.on('data', (chunk: Buffer) => {
      const room = request.maxStderrBytes - stderr.length;
      if (room > 0) {
        stderr += chunk.toString('utf8').slice(0, room);
      }
    });
    child.on('error', (error: Error) => {
      stderr = stderr.length > 0 ? stderr : error.message;
      finish(MediaProcessStatus.SPAWN_FAILED, null);
    });
    child.on('close', (code: number | null) => {
      finish(MediaProcessStatus.EXITED, code);
    });
  });
}

/** A fresh, randomly named, private temp dir for one job (`mkdtemp`, mode 0700). */
export async function createMediaTempDir(): Promise<string> {
  return mkdtemp(path.join(tmpdir(), MEDIA_TEMP_DIR_PREFIX));
}

/**
 * Removes a job's temp dir and everything in it. Never throws: it runs in a
 * `finally`, and a cleanup error must not mask the job's real outcome.
 */
export async function removeMediaTempDir(dir: string): Promise<void> {
  try {
    await rm(dir, { recursive: true, force: true });
  } catch (error: unknown) {
    logger.error(
      `removeMediaTempDir: could not remove ${dir} — ${error instanceof Error ? error.message : 'unknown error'}`,
    );
  }
}

/** A path inside a job's temp dir. `name` is always a constant or a formatted integer. */
export function mediaTempPath(dir: string, name: string): string {
  return path.join(dir, name);
}

/** Writes the service-owned copy of the upload (mode 0600) into the job's temp dir. */
export async function writeMediaTempFile(
  dir: string,
  name: string,
  bytes: Buffer,
): Promise<string> {
  const target = mediaTempPath(dir, name);
  await writeFile(target, bytes, { mode: 0o600 });
  return target;
}

/**
 * Reads an ffmpeg output back, or null when it is missing, empty, or larger
 * than `maxBytes` (checked with `stat` BEFORE the read, so an oversized output
 * is never loaded into memory).
 */
export async function readMediaTempFile(
  filePath: string,
  maxBytes: number,
): Promise<Buffer | null> {
  try {
    const info = await stat(filePath);
    if (!info.isFile() || info.size === 0 || info.size > maxBytes) {
      logger.warn(
        `readMediaTempFile: ${path.basename(filePath)} rejected size=${String(info.size)} max=${String(maxBytes)}`,
      );
      return null;
    }
    return await readFile(filePath);
  } catch {
    return null;
  }
}
