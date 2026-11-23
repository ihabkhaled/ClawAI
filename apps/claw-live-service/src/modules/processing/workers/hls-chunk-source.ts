import { rm, unlink, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

import { runBoundedProcess } from '../../../common/utilities/process.utility';
import { LiveMode, LiveSourceKind } from '../../../generated/prisma';
import { SERVER_PULL_REFRESH_MIN_INTERVAL_MS } from '../../sources/constants/server-pull.constants';
import {
  FIXTURE_URL_PREFIX,
  HLS_PLAYLIST_MAX_BYTES,
  HLS_SEGMENT_MAX_BYTES,
} from '../../sources/constants/sources.constants';
import type { FixtureBroadcasterService } from '../../sources/services/fixture-broadcaster.service';
import type { HlsFetcherService } from '../../sources/services/hls-fetcher.service';
import type { HlsHostPin } from '../../sources/types/hls-proxy.types';
import {
  AUDIO_CHANNELS,
  AUDIO_CHUNK_BYTES,
  AUDIO_CHUNK_SECONDS,
  AUDIO_DISCONTINUITY_MS,
  AUDIO_MIN_FLUSH_BYTES,
  AUDIO_SAMPLE_RATE,
  FFMPEG_BINARY,
  FFMPEG_DECODE_TIMEOUT_MS,
  FFMPEG_MAX_PCM_BYTES,
} from '../constants/processing.constants';
import type {
  AudioChunk,
  ChunkPoll,
  ParsedPlaylist,
  PlaylistSegment,
  RunChunkSource,
  ServerPullSource,
  WorkerContext,
} from '../types/processing.types';
import { parsePlaylist, pickPlaylistVariant } from '../utilities/hls-playlist.utility';
import { pcmToWav } from '../utilities/wav.utility';

/**
 * Pulls a live HLS source into 6 s, 16 kHz mono WAV chunks stamped with media time.
 *
 * The playlist and every segment are fetched by THIS process through HlsFetcherService
 * (SSRF guard, host pin, DNS-pinned connection, size caps); ffmpeg only ever decodes a
 * local file (`-protocol_whitelist file`), so it can never be steered to another host or
 * follow a redirect. FIXTURE sources read the local broadcaster's files.
 *
 * A fresh source starts at the Live Edge (the newest segment) and never back-fills.
 * Media time comes from EXT-X-PROGRAM-DATE-TIME, else from capture wall clock.
 */
export class HlsChunkSource implements RunChunkSource {
  private nextSequence: number | null = null;
  private mediaUrl: URL | null = null;
  private initSegment: Buffer | null = null;
  private pcm: Buffer = Buffer.alloc(0);
  private pcmStartAt: number | null = null;
  private expectedNextAt: number | null = null;
  private files: string[] = [];
  private fileCounter = 0;
  /** Server pull: the resolved master playlist (its token expires) and when it was resolved. */
  private pulledOrigin: URL | null = null;
  private pulledAt = 0;

  constructor(
    private readonly context: WorkerContext,
    private readonly fetcher: HlsFetcherService,
    private readonly fixtures: FixtureBroadcasterService,
    private readonly directory: string,
    private readonly pull: ServerPullSource | null = null,
  ) {}

  async poll(): Promise<ChunkPoll> {
    const playlist = await this.loadMediaPlaylist();
    const fresh = this.selectFresh(playlist);
    for (const segment of fresh) {
      const file = await this.materialize(segment, playlist);
      const pcm = await this.decode(file);
      this.append(pcm, segment.programDateMs ?? this.expectedNextAt ?? Date.now());
    }
    const last = playlist.segments.at(-1);
    const ended =
      playlist.endList && (last === undefined || (this.nextSequence ?? 0) > last.sequence);
    return { chunks: this.cut(ended), ended, latestSegmentFile: this.files.at(-1) ?? null };
  }

  async dispose(): Promise<void> {
    await rm(this.directory, { recursive: true, force: true }).catch(() => {});
  }

  private fixtureName(): string {
    return this.context.sourceUrl.slice(FIXTURE_URL_PREFIX.length);
  }

  private async loadMediaPlaylist(): Promise<ParsedPlaylist> {
    if (this.context.sourceKind === LiveSourceKind.FIXTURE) {
      this.fixtures.touch(this.fixtureName());
      const text = await this.fixtures.readFile(this.fixtureName(), 'index.m3u8');
      return parsePlaylist(text.toString('utf8'));
    }
    try {
      return await this.fetchMediaPlaylist();
    } catch (error: unknown) {
      this.forgetPulledOrigin();
      throw error;
    }
  }

  private async fetchMediaPlaylist(): Promise<ParsedPlaylist> {
    const host = this.hostPin();
    const url = this.mediaUrl ?? (await this.originUrl());
    const fetched = await this.fetcher.fetchObject(url, host, HLS_PLAYLIST_MAX_BYTES);
    const parsed = parsePlaylist(fetched.body.toString('utf8'));
    if (parsed.segments.length > 0 || parsed.variants.length === 0) {
      this.mediaUrl = url;
      return parsed;
    }
    const variant = pickPlaylistVariant(parsed.variants, this.context.mode !== LiveMode.AUDIO);
    if (!variant) return parsed;
    this.mediaUrl = new URL(variant.uri, url);
    const media = await this.fetcher.fetchObject(this.mediaUrl, host, HLS_PLAYLIST_MAX_BYTES);
    return parsePlaylist(media.body.toString('utf8'));
  }

  /** The source URL, or for server pull the resolved master playlist (resolved on demand). */
  private async originUrl(): Promise<URL> {
    if (this.pull === null) return new URL(this.context.sourceUrl);
    if (this.pulledOrigin !== null) return this.pulledOrigin;
    const resolved = await this.pull.resolvePlaylist();
    if (resolved === null) throw new Error('LIVE_SERVER_PULL_UNAVAILABLE');
    this.pulledOrigin = resolved;
    this.pulledAt = Date.now();
    return resolved;
  }

  /**
   * A failed playlist fetch of a pulled stream usually means an expired token: drop it so the next
   * poll resolves a fresh one, at most once per SERVER_PULL_REFRESH_MIN_INTERVAL_MS. The worker's
   * poll-failure ceiling still ends a stream that went offline.
   */
  private forgetPulledOrigin(): void {
    if (this.pull === null || Date.now() - this.pulledAt < SERVER_PULL_REFRESH_MIN_INTERVAL_MS) {
      return;
    }
    this.pulledOrigin = null;
    this.mediaUrl = null;
  }

  private selectFresh(playlist: ParsedPlaylist): PlaylistSegment[] {
    const segments = playlist.segments;
    const newest = segments.at(-1);
    const oldest = segments[0];
    if (!newest || !oldest) return [];
    if (this.nextSequence === null) {
      this.nextSequence = newest.sequence + 1;
      return [newest];
    }
    if (this.nextSequence < oldest.sequence) this.resetBuffer();
    const fresh = segments.filter((segment) => segment.sequence >= (this.nextSequence ?? 0));
    this.nextSequence = Math.max(this.nextSequence, newest.sequence + 1);
    return fresh;
  }

  private async materialize(segment: PlaylistSegment, playlist: ParsedPlaylist): Promise<string> {
    let body: Buffer;
    if (this.context.sourceKind === LiveSourceKind.FIXTURE) {
      body = await this.fixtures.readFile(this.fixtureName(), segment.uri);
    } else {
      const base = this.mediaUrl ?? (await this.originUrl());
      const fetched = await this.fetcher.fetchObject(
        new URL(segment.uri, base),
        this.hostPin(),
        HLS_SEGMENT_MAX_BYTES,
      );
      body = fetched.body;
      if (playlist.mapUri) {
        this.initSegment ??= (
          await this.fetcher.fetchObject(
            new URL(playlist.mapUri, base),
            this.hostPin(),
            HLS_SEGMENT_MAX_BYTES,
          )
        ).body;
        body = Buffer.concat([this.initSegment, body]);
      }
    }
    this.fileCounter += 1;
    const file = join(this.directory, `segment-${String(this.fileCounter)}.bin`);
    // eslint-disable-next-line security/detect-non-literal-fs-filename -- our own per-run temp dir
    await writeFile(file, body);
    this.files.push(file);
    const stale = this.files.splice(0, Math.max(0, this.files.length - 2));
    // eslint-disable-next-line security/detect-non-literal-fs-filename -- our own per-run temp dir
    await Promise.all(stale.map((old) => unlink(old).catch(() => {})));
    return file;
  }

  private async decode(file: string): Promise<Buffer> {
    try {
      const result = await runBoundedProcess(
        FFMPEG_BINARY,
        [
          ...['-hide_banner', '-loglevel', 'error', '-protocol_whitelist', 'file', '-i', file],
          ...[
            '-vn',
            '-ac',
            String(AUDIO_CHANNELS),
            '-ar',
            String(AUDIO_SAMPLE_RATE),
            '-f',
            's16le',
            'pipe:1',
          ],
        ],
        { timeoutMs: FFMPEG_DECODE_TIMEOUT_MS, maxOutputBytes: FFMPEG_MAX_PCM_BYTES },
      );
      return result.exitCode === 0 ? result.stdout : Buffer.alloc(0);
    } catch {
      return Buffer.alloc(0);
    }
  }

  /** Appends decoded PCM that starts at media time `startAt`; a time jump restarts the buffer. */
  append(pcm: Buffer, startAt: number): void {
    if (
      this.expectedNextAt !== null &&
      Math.abs(startAt - this.expectedNextAt) > AUDIO_DISCONTINUITY_MS
    ) {
      this.resetBuffer();
    }
    if (this.pcm.length === 0) this.pcmStartAt = startAt;
    this.pcm = Buffer.concat([this.pcm, pcm]);
    this.expectedNextAt = startAt + this.bytesToMs(pcm.length);
  }

  /** Cuts every full 6 s chunk (and, at stream end, a ≥ 1 s remainder). */
  cut(flush: boolean): AudioChunk[] {
    const chunks: AudioChunk[] = [];
    while (
      this.pcm.length >= AUDIO_CHUNK_BYTES ||
      (flush && this.pcm.length >= AUDIO_MIN_FLUSH_BYTES)
    ) {
      const size = Math.min(AUDIO_CHUNK_BYTES, this.pcm.length);
      const startAt = this.pcmStartAt ?? Date.now();
      const durationMs =
        size === AUDIO_CHUNK_BYTES ? AUDIO_CHUNK_SECONDS * 1000 : this.bytesToMs(size);
      chunks.push({
        wav: pcmToWav(this.pcm.subarray(0, size), AUDIO_SAMPLE_RATE, AUDIO_CHANNELS),
        startAt,
        endAt: startAt + durationMs,
      });
      this.pcm = this.pcm.subarray(size);
      this.pcmStartAt = startAt + durationMs;
    }
    if (flush) this.resetBuffer();
    return chunks;
  }

  private resetBuffer(): void {
    this.pcm = Buffer.alloc(0);
    this.pcmStartAt = null;
    this.expectedNextAt = null;
  }

  private bytesToMs(bytes: number): number {
    return Math.round((bytes / (AUDIO_SAMPLE_RATE * AUDIO_CHANNELS * 2)) * 1000);
  }

  /** Server pull: the platform CDN's host suffixes; HLS: the stream's declared host. */
  private hostPin(): HlsHostPin {
    if (this.pull !== null) return this.pull.hostSuffixes;
    if (!this.context.declaredHost) throw new Error('LIVE_SOURCE_HOST_MISSING');
    return this.context.declaredHost;
  }
}
