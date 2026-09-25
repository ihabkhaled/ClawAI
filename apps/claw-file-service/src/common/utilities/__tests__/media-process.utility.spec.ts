// Multimodal batch 7 — the bounded process runner. `node:child_process` is
// mocked, so no ffmpeg is needed: what is asserted is exactly how the runner
// spawns and when it kills — the security properties, not the binary.

import { EventEmitter } from 'node:events';
import { existsSync } from 'node:fs';
import { readFile as readFileAsync, writeFile as writeFileAsync } from 'node:fs/promises';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { spawn } from 'node:child_process';
import { MediaProcessStatus } from '../../enums';
import {
  createMediaTempDir,
  readMediaTempFile,
  removeMediaTempDir,
  runMediaProcess,
  writeMediaTempFile,
} from '../media-process.utility';

vi.mock('node:child_process', () => ({ spawn: vi.fn() }));

const mockedSpawn = vi.mocked(spawn);

class FakeChild extends EventEmitter {
  stdout = new EventEmitter();
  stderr = new EventEmitter();
  kill = vi.fn(() => true);
}

const REQUEST = {
  command: 'ffprobe',
  args: ['-i', '/tmp/claw-media-x/input'],
  timeoutMs: 1_000,
  maxStdoutBytes: 16,
  maxStderrBytes: 8,
};

let child: FakeChild;

describe('runMediaProcess', () => {
  beforeEach(() => {
    child = new FakeChild();
    mockedSpawn.mockReset();
    mockedSpawn.mockReturnValue(child as never);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('spawns with an argument ARRAY, no shell, and stdin ignored', async () => {
    const pending = runMediaProcess(REQUEST);
    child.emit('close', 0);
    await pending;

    const [command, args, options] = mockedSpawn.mock.calls[0] ?? [];
    expect(command).toBe('ffprobe');
    expect(args).toEqual(REQUEST.args);
    expect(options).toMatchObject({ shell: false, stdio: ['ignore', 'pipe', 'pipe'] });
  });

  it('returns stdout and the exit code when the process exits on its own', async () => {
    const pending = runMediaProcess(REQUEST);
    child.stdout.emit('data', Buffer.from('{"a":1}'));
    child.emit('close', 0);

    const result = await pending;
    expect(result.status).toBe(MediaProcessStatus.EXITED);
    expect(result.exitCode).toBe(0);
    expect(result.stdout.toString()).toBe('{"a":1}');
  });

  it('SIGKILLs a process that runs past its wall-clock budget', async () => {
    vi.useFakeTimers();
    const pending = runMediaProcess(REQUEST);
    vi.advanceTimersByTime(REQUEST.timeoutMs + 1);

    const result = await pending;
    expect(child.kill).toHaveBeenCalledWith('SIGKILL');
    expect(result.status).toBe(MediaProcessStatus.TIMED_OUT);
    expect(result.exitCode).toBeNull();
  });

  it('SIGKILLs a process whose stdout passes the byte cap, and keeps nothing past it', async () => {
    const pending = runMediaProcess(REQUEST);
    child.stdout.emit('data', Buffer.alloc(10, 'a'));
    child.stdout.emit('data', Buffer.alloc(10, 'b'));

    const result = await pending;
    expect(child.kill).toHaveBeenCalledWith('SIGKILL');
    expect(result.status).toBe(MediaProcessStatus.OUTPUT_LIMIT_EXCEEDED);
    expect(result.stdout.length).toBeLessThanOrEqual(REQUEST.maxStdoutBytes);
  });

  it('keeps only the head of stderr', async () => {
    const pending = runMediaProcess(REQUEST);
    child.stderr.emit('data', Buffer.from('0123456789abcdef'));
    child.emit('close', 1);

    const result = await pending;
    expect(result.stderr).toBe('01234567');
    expect(result.exitCode).toBe(1);
  });

  it('reports a missing binary as SPAWN_FAILED instead of throwing', async () => {
    const pending = runMediaProcess(REQUEST);
    child.emit('error', Object.assign(new Error('spawn ffprobe ENOENT'), { code: 'ENOENT' }));

    const result = await pending;
    expect(result.status).toBe(MediaProcessStatus.SPAWN_FAILED);
    expect(result.stderr).toContain('ENOENT');
  });

  it('reports a synchronous spawn throw as SPAWN_FAILED', async () => {
    mockedSpawn.mockImplementation(() => {
      throw new Error('EACCES');
    });
    const result = await runMediaProcess(REQUEST);
    expect(result.status).toBe(MediaProcessStatus.SPAWN_FAILED);
  });

  it('a cancel (AbortSignal) SIGKILLs the running child and ends ABORTED', async () => {
    const controller = new AbortController();
    const pending = runMediaProcess({ ...REQUEST, signal: controller.signal });
    controller.abort();
    child.emit('close', null);

    const result = await pending;
    expect(child.kill).toHaveBeenCalledWith('SIGKILL');
    expect(result.status).toBe(MediaProcessStatus.ABORTED);
    expect(result.exitCode).toBeNull();
  });

  it('an already-cancelled signal never spawns a child', async () => {
    const controller = new AbortController();
    controller.abort();
    const result = await runMediaProcess({ ...REQUEST, signal: controller.signal });
    expect(mockedSpawn).not.toHaveBeenCalled();
    expect(result.status).toBe(MediaProcessStatus.ABORTED);
  });

  it('a normal exit detaches the abort listener: a later cancel kills nothing', async () => {
    const controller = new AbortController();
    const pending = runMediaProcess({ ...REQUEST, signal: controller.signal });
    child.emit('close', 0);
    expect((await pending).status).toBe(MediaProcessStatus.EXITED);
    controller.abort();
    expect(child.kill).not.toHaveBeenCalled();
  });

  it('settles once: a close after a timeout does not overwrite the verdict', async () => {
    vi.useFakeTimers();
    const pending = runMediaProcess(REQUEST);
    vi.advanceTimersByTime(REQUEST.timeoutMs + 1);
    child.emit('close', 0);

    expect((await pending).status).toBe(MediaProcessStatus.TIMED_OUT);
  });
});

describe('media temp dir', () => {
  it('creates a private, randomly named dir and removes it with its contents', async () => {
    const first = await createMediaTempDir();
    const second = await createMediaTempDir();
    expect(first).not.toBe(second);
    expect(path.basename(first)).toMatch(/^claw-media-/);

    const written = await writeMediaTempFile(first, 'input', Buffer.from('bytes'));
    expect(await readFileAsync(written, 'utf8')).toBe('bytes');

    await removeMediaTempDir(first);
    await removeMediaTempDir(second);
    expect(existsSync(first)).toBe(false);
    expect(existsSync(second)).toBe(false);
  });

  it('removing a dir that is already gone does not throw', async () => {
    const dir = await createMediaTempDir();
    await removeMediaTempDir(dir);
    await expect(removeMediaTempDir(dir)).resolves.toBeUndefined();
  });

  it('refuses to read back an output over its byte cap, or one that is missing', async () => {
    const dir = await createMediaTempDir();
    try {
      const big = path.join(dir, 'big.jpg');
      await writeFileAsync(big, Buffer.alloc(100));
      expect(await readMediaTempFile(big, 99)).toBeNull();
      expect((await readMediaTempFile(big, 100))?.length).toBe(100);
      expect(await readMediaTempFile(path.join(dir, 'missing.jpg'), 100)).toBeNull();
    } finally {
      await removeMediaTempDir(dir);
    }
  });
});
