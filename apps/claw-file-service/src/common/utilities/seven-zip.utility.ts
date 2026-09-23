import * as fs from 'node:fs';
import * as path from 'node:path';
import { Logger } from '@nestjs/common';
import SevenZip, { type SevenZipModule } from '7z-wasm';
import {
  SEVEN_ZIP_INPUT_MOUNT,
  SEVEN_ZIP_LISTFILE_PATH,
  SEVEN_ZIP_MEMORY_LIMIT_SWITCH,
  SEVEN_ZIP_OUTPUT_MOUNT,
  SEVEN_ZIP_PASSWORD_PROMPT,
  SEVEN_ZIP_STDERR_MAX_BYTES,
  SEVEN_ZIP_WRITE_BUFFER_BYTES,
} from '../../modules/files/constants/archive-formats.constants';
import type {
  SevenZipExtractRequest,
  SevenZipFileSink,
  SevenZipInvocation,
  SevenZipListOutcome,
  SevenZipListRequest,
  SevenZipMount,
  SevenZipRunOutcome,
  SevenZipStreamOutcome,
  SevenZipStreamRequest,
  SevenZipTextCollector,
} from '../../modules/files/types/archive-engine.types';

const logger = new Logger('SevenZipEngine');

// The ONLY file that touches `7z-wasm` (rules/13). 7-Zip 24.09 compiled to
// WebAssembly: no native addon, so it runs unchanged on the Debian image and on
// a Windows dev box where Smart App Control blocks unsigned .node binaries.
//
// Four things about the Emscripten build that every caller relies on:
//
// 1. Every run gets a FRESH instance (~5 ms). A run that throws leaves the WASM
//    heap in an undefined state; nothing is ever reused after one.
// 2. `stdin` throws. Emscripten's default stdin does a blocking read of the
//    service's own fd 0; 7-Zip asks for a password there when an archive's
//    headers are encrypted. Throwing turns that into an engine error, printed
//    after "Enter password" so the caller can say why.
// 3. The glue writes `process.exitCode` on every exit — a non-zero 7-Zip run
//    would otherwise make the whole service exit non-zero on its next clean
//    shutdown. It is saved and restored around each run.
// 4. Archives are read and written through NODEFS mounts of real host
//    directories. Nothing is copied into the WASM heap, so peak memory is the
//    decoder's dictionary (capped by -smemx), not the archive size.

/**
 * Lists an archive with `l -slt`. The listing is bounded: past
 * `maxOutputBytes` the run is aborted and `outputLimitReached` is set.
 */
export async function listSevenZipArchive(
  request: SevenZipListRequest,
): Promise<SevenZipListOutcome> {
  const collector = createTextCollector(request.maxOutputBytes, true);
  const outcome = await runSevenZip({
    args: [
      'l',
      '-slt',
      `-t${request.format}`,
      SEVEN_ZIP_MEMORY_LIMIT_SWITCH,
      engineArchivePath(request.archivePath),
    ],
    password: request.password,
    mounts: [inputMount(request.archivePath)],
    memoryFiles: [],
    onStdout: collector.push,
  });
  const text = collector.text();
  return {
    ...outcome,
    text,
    passwordRequired: text.includes(SEVEN_ZIP_PASSWORD_PROMPT),
    outputLimitReached: collector.overflowed(),
  };
}

/**
 * Extracts exactly `entryNames` into `destDir`. Names are passed through a list
 * file with wildcards disabled (`-spd`), so an entry literally named `*` is one
 * entry, not all of them.
 */
export async function extractSevenZipEntries(
  request: SevenZipExtractRequest,
): Promise<SevenZipRunOutcome> {
  return runSevenZip({
    args: [
      'x',
      `-t${request.format}`,
      SEVEN_ZIP_MEMORY_LIMIT_SWITCH,
      '-y',
      '-spd',
      '-scsUTF-8',
      '-bso0',
      '-bsp0',
      `-o${SEVEN_ZIP_OUTPUT_MOUNT}`,
      engineArchivePath(request.archivePath),
      `@${SEVEN_ZIP_LISTFILE_PATH}`,
    ],
    password: request.password,
    mounts: [
      inputMount(request.archivePath),
      { hostDir: request.destDir, mountPoint: SEVEN_ZIP_OUTPUT_MOUNT },
    ],
    memoryFiles: [{ path: SEVEN_ZIP_LISTFILE_PATH, content: `${request.entryNames.join('\n')}\n` }],
    onStdout: discardByte,
  });
}

/**
 * Decompresses a gzip/bzip2/xz stream to `outPath` through stdout (`-so`).
 * Stream codecs carry no trustworthy size — gzip's trailer is modulo 4 GB and
 * bzip2 has none — so the byte count is enforced while writing: the byte past
 * `maxBytes` fails the write and 7-Zip stops.
 */
export async function streamSevenZipPayload(
  request: SevenZipStreamRequest,
): Promise<SevenZipStreamOutcome> {
  const sink = createFileSink(request.outPath, request.maxBytes);
  let outcome: SevenZipRunOutcome;
  try {
    outcome = await runSevenZip({
      args: [
        'x',
        `-t${request.format}`,
        SEVEN_ZIP_MEMORY_LIMIT_SWITCH,
        '-so',
        '-bsp0',
        engineArchivePath(request.archivePath),
      ],
      password: request.password,
      mounts: [inputMount(request.archivePath)],
      memoryFiles: [],
      onStdout: sink.push,
    });
  } finally {
    sink.close();
  }
  return { ...outcome, bytesWritten: sink.bytesWritten(), limitExceeded: sink.exceeded() };
}

async function runSevenZip(invocation: SevenZipInvocation): Promise<SevenZipRunOutcome> {
  const stderr = createTextCollector(SEVEN_ZIP_STDERR_MAX_BYTES, false);
  const engine = await SevenZip({
    stdin: refuseStdin,
    stdout: invocation.onStdout,
    stderr: stderr.push,
  });
  disablePermissionChanges(engine);
  for (const mount of invocation.mounts) {
    engine.FS.mkdir(mount.mountPoint);
    engine.FS.mount(engine.NODEFS, { root: mount.hostDir }, mount.mountPoint);
  }
  for (const file of invocation.memoryFiles) {
    engine.FS.writeFile(file.path, file.content);
  }

  logger.debug(`runSevenZip: 7zz ${invocation.args.join(' ')}`);
  const exitCode = callMainPreservingExitCode(engine, withPassword(invocation));
  engine.FS.quit();
  if (exitCode !== 0) {
    logger.warn(`runSevenZip: ${invocation.args[0] ?? '?'} exited ${String(exitCode)}`);
  }
  return { exitCode, stderr: stderr.text() };
}

function callMainPreservingExitCode(engine: SevenZipModule, args: string[]): number | null {
  const previousExitCode = process.exitCode;
  try {
    // A copy: Emscripten's callMain unshifts the program name into the array
    // it is given. Typed `void` by the package; it returns 7-Zip's exit code.
    const result: unknown = engine.callMain([...args]);
    return typeof result === 'number' ? result : null;
  } catch (error: unknown) {
    // A C++ exception escaping 7-Zip (a refused password prompt, a corrupt
    // header) arrives as a bare number. Only its type is logged: the value is
    // a heap pointer, and the arguments may hold a password.
    logger.warn(`runSevenZip: engine threw (${typeof error})`);
    return null;
  } finally {
    process.exitCode = previousExitCode;
  }
}

// The password goes in as a switch right after the command. It is added here,
// after the arguments were logged, and exists nowhere else.
function withPassword(invocation: SevenZipInvocation): string[] {
  const [command, ...rest] = invocation.args;
  return invocation.password === undefined || command === undefined
    ? invocation.args
    : [command, `-p${invocation.password}`, ...rest];
}

// 7-Zip applies each entry's stored mode after writing it. A tar entry with mode
// 000 makes its own directory unwritable, and a stored setuid bit would land on
// the host. Extracted bytes are read once and copied, so no mode is ever needed.
function disablePermissionChanges(engine: SevenZipModule): void {
  engine.FS.chmod = noPermissionChange;
  engine.FS.lchmod = noPermissionChange;
  engine.FS.fchmod = noPermissionChange;
}

function noPermissionChange(): void {
  // Intentionally empty: see disablePermissionChanges.
}

function refuseStdin(): number {
  throw new Error('7-Zip stdin is closed');
}

function discardByte(): void {
  // Extraction runs with -bso0; anything still printed is not needed.
}

function inputMount(archivePath: string): SevenZipMount {
  return { hostDir: path.dirname(archivePath), mountPoint: SEVEN_ZIP_INPUT_MOUNT };
}

function engineArchivePath(archivePath: string): string {
  return path.posix.join(SEVEN_ZIP_INPUT_MOUNT, path.basename(archivePath));
}

function createTextCollector(maxBytes: number, failOnOverflow: boolean): SevenZipTextCollector {
  const chunks: Buffer[] = [];
  let current = Buffer.alloc(Math.min(maxBytes, SEVEN_ZIP_WRITE_BUFFER_BYTES));
  let offset = 0;
  let total = 0;
  let overflow = false;
  return {
    push: (byte: number): void => {
      if (total >= maxBytes) {
        overflow = true;
        if (failOnOverflow) {
          throw new RangeError('7-Zip output limit reached');
        }
        return;
      }
      if (offset === current.length) {
        chunks.push(current);
        current = Buffer.alloc(SEVEN_ZIP_WRITE_BUFFER_BYTES);
        offset = 0;
      }
      current[offset] = byte;
      offset += 1;
      total += 1;
    },
    text: (): string => Buffer.concat([...chunks, current.subarray(0, offset)]).toString('utf8'),
    overflowed: (): boolean => overflow,
  };
}

function createFileSink(outPath: string, maxBytes: number): SevenZipFileSink {
  const fd = fs.openSync(outPath, 'w');
  const buffer = Buffer.alloc(SEVEN_ZIP_WRITE_BUFFER_BYTES);
  let offset = 0;
  let written = 0;
  let exceeded = false;
  let closed = false;
  const flush = (): void => {
    if (offset > 0) {
      fs.writeSync(fd, buffer, 0, offset);
      offset = 0;
    }
  };
  return {
    push: (byte: number): void => {
      if (written >= maxBytes) {
        exceeded = true;
        throw new RangeError('stream output limit reached');
      }
      buffer[offset] = byte;
      offset += 1;
      written += 1;
      if (offset === buffer.length) {
        flush();
      }
    },
    close: (): void => {
      if (closed) {
        return;
      }
      closed = true;
      flush();
      fs.closeSync(fd);
    },
    bytesWritten: (): number => written,
    exceeded: (): boolean => exceeded,
  };
}
