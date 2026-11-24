import { rm } from 'node:fs/promises';
import { join } from 'node:path';

import { runBoundedProcess } from '../../../common/utilities/process.utility';
import { LiveMode } from '../../../generated/prisma';
import {
  RECORDED_FRAME_FILE,
  RECORDED_MAX_CHUNKS_PER_POLL,
} from '../../sources/constants/recorded-video.constants';
import type { RecordedVideoService } from '../../sources/services/recorded-video.service';
import {
  AUDIO_CHANNELS,
  AUDIO_CHUNK_SECONDS,
  AUDIO_SAMPLE_RATE,
  FFMPEG_BINARY,
  FFMPEG_DECODE_TIMEOUT_MS,
  FFMPEG_FRAME_TIMEOUT_MS,
  FFMPEG_MAX_FRAME_BYTES,
  FFMPEG_MAX_PCM_BYTES,
  FFPROBE_BINARY,
  RECORDED_MIN_TAIL_SECONDS,
  RECORDED_SUMMARY_CHUNK_SECONDS,
  RECORDED_SUMMARY_CHUNKS_PER_POLL,
} from '../constants/processing.constants';
import type {
  AudioChunk,
  ChunkPoll,
  RecordedSourceOptions,
  RunChunkSource,
  WorkerContext,
} from '../types/processing.types';
import { pcmToWav } from '../utilities/wav.utility';

/**
 * RECORDED runs (ADR-221 batch 6): the video is downloaded once by yt-dlp into this run's temp
 * dir. Play-along: each poll cuts the 6 s chunks the clock has reached (at most a few per poll),
 * stamped with play-along media time. A one-click summary (`options.summary`) cuts 30 s pieces as
 * fast as transcription allows, on media time from the run's start. Either way one frame per poll
 * for the vision modes, and nothing advances while no viewer is billable. ffmpeg only ever reads the local file (`-protocol_whitelist file`). The run ends
 * when the clock passes the video's end. Nothing waits on the download: polls answer empty until
 * it lands (the run reads DELAYED meanwhile, so nothing accrues).
 */
export class RecordedChunkSource implements RunChunkSource {
  private download: Promise<void> | null = null;
  /** undefined while yt-dlp still runs; then the local file, or null when it failed. */
  private downloaded: string | null | undefined = undefined;
  private file: string | null = null;
  private durationSeconds = 0;
  /** Media time 0 on the wall clock: when play-along started (minus pauses), or the summary run's start. */
  private mediaZeroAt = 0;
  private pausedSince: number | null = null;
  private positionSeconds = 0;

  constructor(
    private readonly context: WorkerContext,
    private readonly videos: RecordedVideoService,
    private readonly directory: string,
    private readonly options: RecordedSourceOptions,
  ) {}

  async poll(): Promise<ChunkPoll> {
    const idle = { chunks: [], ended: false, latestSegmentFile: null };
    if (this.file === null && !(await this.ready())) return idle;
    if (!(await this.advancing())) return idle;
    const file = this.file ?? '';
    const piece = this.options.summary ? RECORDED_SUMMARY_CHUNK_SECONDS : AUDIO_CHUNK_SECONDS;
    const perPoll = this.options.summary
      ? RECORDED_SUMMARY_CHUNKS_PER_POLL
      : RECORDED_MAX_CHUNKS_PER_POLL;
    // Play-along cuts only what the clock has reached; a summary reads as fast as it can.
    const reached = this.options.summary
      ? this.durationSeconds
      : Math.min(this.durationSeconds, (Date.now() - this.mediaZeroAt) / 1000);
    const chunks: AudioChunk[] = [];
    while (chunks.length < perPoll) {
      const length = Math.min(piece, this.durationSeconds - this.positionSeconds);
      const atEnd = this.positionSeconds + length >= this.durationSeconds;
      if (length <= 0 || this.positionSeconds + length > reached) break;
      if (length >= RECORDED_MIN_TAIL_SECONDS || !atEnd) {
        chunks.push(await this.cut(file, this.positionSeconds, length));
      }
      this.positionSeconds += length;
    }
    const ended = this.positionSeconds >= this.durationSeconds;
    const frame = chunks.length > 0 ? await this.frame(file) : null;
    return { chunks, ended, latestSegmentFile: frame, mediaSeconds: this.positionSeconds };
  }

  /**
   * False while no viewer of the run is billable (waiting for credits): nothing is cut, and the
   * play-along clock stops, so the video resumes where it paused.
   */
  private async advancing(): Promise<boolean> {
    const billable = await this.options.canAdvance();
    if (!billable) {
      this.pausedSince ??= Date.now();
      return false;
    }
    if (this.pausedSince !== null && !this.options.summary) {
      this.mediaZeroAt += Date.now() - this.pausedSince;
    }
    this.pausedSince = null;
    return true;
  }

  async dispose(): Promise<void> {
    await rm(this.directory, { recursive: true, force: true }).catch(() => {});
  }

  /** Starts the download once; true when the file is on disk and its length is known. */
  private async ready(): Promise<boolean> {
    this.download ??= this.videos
      .download(this.options.watchUrl, this.directory, this.context.mode !== LiveMode.AUDIO)
      .then((file) => {
        this.downloaded = file;
      });
    const file = this.downloaded;
    if (file === undefined) return false;
    if (file === null) throw new Error('LIVE_RECORDED_DOWNLOAD_FAILED');
    const duration = await this.probeDuration(file);
    if (duration === null) throw new Error('LIVE_RECORDED_UNREADABLE');
    this.file = file;
    this.durationSeconds = duration;
    // A summary's media time starts at the run's start, so the page can show mm:ss offsets.
    this.mediaZeroAt = this.options.summary ? this.context.startedAt.getTime() : Date.now();
    return true;
  }

  private async probeDuration(file: string): Promise<number | null> {
    const result = await runBoundedProcess(
      FFPROBE_BINARY,
      [
        ...['-v', 'error', '-protocol_whitelist', 'file', '-show_entries', 'format=duration'],
        ...['-of', 'default=noprint_wrappers=1:nokey=1', file],
      ],
      { timeoutMs: FFMPEG_FRAME_TIMEOUT_MS, maxOutputBytes: FFMPEG_MAX_FRAME_BYTES },
    ).catch(() => null);
    const seconds = Number(result?.stdout.toString('utf8').trim());
    return result?.exitCode === 0 && Number.isFinite(seconds) && seconds > 0 ? seconds : null;
  }

  /** `length` seconds of 16 kHz mono PCM from `at`, as a WAV chunk on play-along media time. */
  private async cut(file: string, at: number, length: number): Promise<AudioChunk> {
    const result = await runBoundedProcess(
      FFMPEG_BINARY,
      [
        ...['-hide_banner', '-loglevel', 'error', '-protocol_whitelist', 'file'],
        ...['-ss', at.toFixed(3), '-t', length.toFixed(3), '-i', file, '-vn'],
        ...[
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
    ).catch(() => null);
    const pcm = result?.exitCode === 0 ? result.stdout : Buffer.alloc(0);
    const startAt = this.mediaZeroAt + Math.round(at * 1000);
    return {
      wav: pcmToWav(pcm, AUDIO_SAMPLE_RATE, AUDIO_CHANNELS),
      startAt,
      endAt: startAt + Math.round(length * 1000),
    };
  }

  /** The frame at the current position (vision modes), written over the previous one. */
  private async frame(file: string): Promise<string | null> {
    if (this.context.mode === LiveMode.AUDIO) return null;
    const target = join(this.directory, RECORDED_FRAME_FILE);
    const result = await runBoundedProcess(
      FFMPEG_BINARY,
      [
        ...['-hide_banner', '-loglevel', 'error', '-protocol_whitelist', 'file', '-y'],
        ...['-ss', Math.max(0, this.positionSeconds - 1).toFixed(3), '-i', file],
        ...['-frames:v', '1', '-q:v', '5', target],
      ],
      { timeoutMs: FFMPEG_FRAME_TIMEOUT_MS, maxOutputBytes: FFMPEG_MAX_FRAME_BYTES },
    ).catch(() => null);
    return result?.exitCode === 0 ? target : null;
  }
}
