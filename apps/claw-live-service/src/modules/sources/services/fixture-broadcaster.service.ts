import { existsSync } from 'node:fs';
import { mkdtemp, readFile, rm, stat } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve, sep } from 'node:path';
import {
  Injectable,
  Logger,
  NotFoundException,
  type OnModuleDestroy,
  ServiceUnavailableException,
} from '@nestjs/common';

import { LiveSourceErrorCode } from '../../../common/enums/live-source-error-code.enum';
import { spawnProcess } from '../../../common/utilities/process.utility';
import {
  FFMPEG_BINARY,
  FIXTURE_HLS_LIST_SIZE,
  FIXTURE_HLS_SEGMENT_SECONDS,
  FIXTURE_IDLE_STOP_MS,
  FIXTURE_IDLE_SWEEP_MS,
  FIXTURE_PLAYLIST_FILE,
  FIXTURE_READY_POLL_MS,
  FIXTURE_READY_TIMEOUT_MS,
  FIXTURE_SEGMENT_FILE_PATTERN,
  FIXTURE_SEGMENT_TEMPLATE,
  FIXTURE_TEMP_PREFIX,
  FIXTURES_DIR,
  LIVE_FIXTURE_FILES,
} from '../constants/sources.constants';
import type { FixtureBroadcast } from '../types/fixture-broadcaster.types';

/**
 * Loops a bundled speech recording into a local live HLS window (with
 * EXT-X-PROGRAM-DATE-TIME), so QA has a real live source. Started lazily on first use,
 * kept alive by touch() while a run or the proxy reads it, stopped after 5 min idle.
 */
@Injectable()
export class FixtureBroadcasterService implements OnModuleDestroy {
  private readonly logger = new Logger(FixtureBroadcasterService.name);
  private readonly broadcasts = new Map<string, FixtureBroadcast>();
  private readonly starting = new Map<string, Promise<FixtureBroadcast>>();
  private sweeper: NodeJS.Timeout | undefined;

  isFixtureName(name: string): boolean {
    return Object.hasOwn(LIVE_FIXTURE_FILES, name);
  }

  /** The broadcaster's HLS directory, starting it when it is not running. */
  async ensure(name: string): Promise<string> {
    const running = this.broadcasts.get(name);
    if (running?.process.exitCode === null) {
      running.lastUsedAt = Date.now();
      return running.directory;
    }
    if (running) await this.stop(name);
    const pending = this.starting.get(name) ?? this.start(name);
    this.starting.set(name, pending);
    try {
      return (await pending).directory;
    } finally {
      this.starting.delete(name);
    }
  }

  touch(name: string): void {
    const running = this.broadcasts.get(name);
    if (running) running.lastUsedAt = Date.now();
  }

  async playlistPath(name: string): Promise<string> {
    return join(await this.ensure(name), FIXTURE_PLAYLIST_FILE);
  }

  /** Reads the playlist or one segment of a broadcast; path-traversal safe by allowlist. */
  async readFile(name: string, file: string): Promise<Buffer> {
    if (file !== FIXTURE_PLAYLIST_FILE && !FIXTURE_SEGMENT_FILE_PATTERN.test(file)) {
      throw new NotFoundException(LiveSourceErrorCode.STREAM_NOT_FOUND);
    }
    const directory = await this.ensure(name);
    const target = resolve(directory, file);
    if (!target.startsWith(`${directory}${sep}`)) {
      throw new NotFoundException(LiveSourceErrorCode.STREAM_NOT_FOUND);
    }
    // eslint-disable-next-line security/detect-non-literal-fs-filename -- allowlisted name inside our temp dir
    return readFile(target).catch(() => {
      throw new NotFoundException(LiveSourceErrorCode.STREAM_NOT_FOUND);
    });
  }

  async onModuleDestroy(): Promise<void> {
    if (this.sweeper) clearInterval(this.sweeper);
    this.sweeper = undefined;
    await Promise.all([...this.broadcasts.keys()].map((name) => this.stop(name)));
  }

  async stop(name: string): Promise<void> {
    const running = this.broadcasts.get(name);
    if (!running) return;
    this.broadcasts.delete(name);
    running.process.kill('SIGKILL');
    await rm(running.directory, { recursive: true, force: true }).catch(() => {});
  }

  /** Stops broadcasts nobody touched for FIXTURE_IDLE_STOP_MS. */
  async sweepIdle(now = Date.now()): Promise<void> {
    const idle = [...this.broadcasts.values()].filter(
      (broadcast) => now - broadcast.lastUsedAt > FIXTURE_IDLE_STOP_MS,
    );
    await Promise.all(idle.map((broadcast) => this.stop(broadcast.name)));
  }

  private async start(name: string): Promise<FixtureBroadcast> {
    const file = new Map(Object.entries(LIVE_FIXTURE_FILES)).get(name);
    const source = file ? join(FIXTURES_DIR, file) : null;
    // eslint-disable-next-line security/detect-non-literal-fs-filename -- constant allowlist path
    if (!source || !existsSync(source)) {
      throw new ServiceUnavailableException(LiveSourceErrorCode.FIXTURE_UNAVAILABLE);
    }
    const directory = await mkdtemp(join(tmpdir(), FIXTURE_TEMP_PREFIX));
    const child = spawnProcess(FFMPEG_BINARY, this.ffmpegArgs(source, directory));
    child.on('error', () => this.logger.warn(`fixture ${name}: ffmpeg could not start`));
    const broadcast = { name, directory, process: child, lastUsedAt: Date.now() };
    this.broadcasts.set(name, broadcast);
    this.ensureSweeper();
    if (!(await this.waitForPlaylist(directory, broadcast))) {
      await this.stop(name);
      throw new ServiceUnavailableException(LiveSourceErrorCode.FIXTURE_UNAVAILABLE);
    }
    this.logger.log(`fixture ${name}: broadcasting`);
    return broadcast;
  }

  private ffmpegArgs(source: string, directory: string): string[] {
    return [
      ...['-hide_banner', '-loglevel', 'error', '-protocol_whitelist', 'file'],
      ...['-re', '-stream_loop', '-1', '-i', source],
      ...['-map', '0:a:0', '-map', '0:v:0?', '-c:a', 'aac', '-b:a', '64k'],
      ...['-c:v', 'libx264', '-preset', 'ultrafast', '-r', '2', '-g', '8', '-sc_threshold', '0'],
      ...['-f', 'hls', '-hls_time', String(FIXTURE_HLS_SEGMENT_SECONDS)],
      ...['-hls_list_size', String(FIXTURE_HLS_LIST_SIZE)],
      ...['-hls_flags', 'delete_segments+program_date_time'],
      ...['-hls_segment_filename', join(directory, FIXTURE_SEGMENT_TEMPLATE)],
      join(directory, FIXTURE_PLAYLIST_FILE),
    ];
  }

  private async waitForPlaylist(directory: string, broadcast: FixtureBroadcast): Promise<boolean> {
    const deadline = Date.now() + FIXTURE_READY_TIMEOUT_MS;
    const playlist = join(directory, FIXTURE_PLAYLIST_FILE);
    while (Date.now() < deadline) {
      if (broadcast.process.exitCode !== null) return false;
      // eslint-disable-next-line security/detect-non-literal-fs-filename -- our own temp dir
      const ready = await stat(playlist).then(
        (info) => info.size > 0,
        () => false,
      );
      if (ready) return true;
      await new Promise((done) => setTimeout(done, FIXTURE_READY_POLL_MS));
    }
    return false;
  }

  private ensureSweeper(): void {
    if (this.sweeper) return;
    this.sweeper = setInterval(() => void this.sweepIdle(), FIXTURE_IDLE_SWEEP_MS);
    this.sweeper.unref();
  }
}
