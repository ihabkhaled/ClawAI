import { Injectable, Logger } from '@nestjs/common';

import type { BoundedProcessResult } from '../../../common/utilities/process.types';
import { runBoundedProcess } from '../../../common/utilities/process.utility';
import {
  RECORDED_VIDEO_MAX_SECONDS_CEILING,
  YTDLP_RECORDED_AUDIO_FORMAT,
  YTDLP_RECORDED_DOWNLOAD_ARGS,
  YTDLP_RECORDED_DOWNLOAD_TIMEOUT_MS,
  YTDLP_RECORDED_OUTPUT_TEMPLATE,
  YTDLP_RECORDED_PROBE_ARGS,
  YTDLP_RECORDED_VISION_FORMAT,
} from '../constants/recorded-video.constants';
import {
  YTDLP_BINARY,
  YTDLP_MAX_CONCURRENT,
  YTDLP_MAX_OUTPUT_BYTES,
  YTDLP_TIMEOUT_MS,
} from '../constants/server-pull.constants';
import type { RecordedProbe } from '../types/server-pull.types';
import { parseRecordedProbeLine, recordedFilePath } from '../utilities/recorded-video.utility';

/**
 * Recorded videos (ADR-221 batch 6): asks yt-dlp whether a link is a recorded video and how long
 * it is, then (worker side) downloads it into the run's temp dir. Same rules as server pull: argv
 * only, no shell, the canonical watch URL we built (never the raw paste), no generic extractor,
 * bounded in time, output, size and concurrency.
 */
@Injectable()
export class RecordedVideoService {
  private readonly logger = new Logger(RecordedVideoService.name);
  private running = 0;

  /** The video's length and id when yt-dlp reads it as a recorded (not live) video, else null. */
  async probe(watchUrl: string): Promise<RecordedProbe | null> {
    const result = await this.bounded(
      [...YTDLP_RECORDED_PROBE_ARGS, '--', watchUrl],
      YTDLP_TIMEOUT_MS,
    );
    if (result === null) return null;
    const probe =
      result.exitCode === 0 ? parseRecordedProbeLine(result.stdout.toString('utf8')) : null;
    if (probe === null) {
      this.logger.warn(
        `yt-dlp read no recorded video at ${watchUrl}: exit=${String(result.exitCode)} ${result.stderrTail.slice(-200).trim()}`,
      );
    }
    return probe;
  }

  /** Downloads the video (vision modes) or its audio into `directory`; the local file, or null. */
  async download(watchUrl: string, directory: string, withVideo: boolean): Promise<string | null> {
    const result = await this.bounded(
      [
        ...YTDLP_RECORDED_DOWNLOAD_ARGS,
        '--match-filters',
        `!is_live & duration<=?${String(RECORDED_VIDEO_MAX_SECONDS_CEILING)}`,
        '--format',
        withVideo ? YTDLP_RECORDED_VISION_FORMAT : YTDLP_RECORDED_AUDIO_FORMAT,
        '--paths',
        directory,
        '--output',
        YTDLP_RECORDED_OUTPUT_TEMPLATE,
        '--',
        watchUrl,
      ],
      YTDLP_RECORDED_DOWNLOAD_TIMEOUT_MS,
    );
    const file =
      result?.exitCode === 0 ? recordedFilePath(result.stdout.toString('utf8'), directory) : null;
    if (file === null) {
      this.logger.warn(
        `yt-dlp could not download ${watchUrl}: exit=${String(result?.exitCode)} ${result?.stderrTail.slice(-200).trim() ?? 'busy'}`,
      );
    }
    return file;
  }

  /** One bounded yt-dlp run, or null at once when every slot is taken. */
  private async bounded(
    args: readonly string[],
    timeoutMs: number,
  ): Promise<BoundedProcessResult | null> {
    if (this.running >= YTDLP_MAX_CONCURRENT) {
      this.logger.warn('yt-dlp busy: recorded-video concurrency cap reached');
      return null;
    }
    this.running += 1;
    try {
      return await runBoundedProcess(YTDLP_BINARY, args, {
        timeoutMs,
        maxOutputBytes: YTDLP_MAX_OUTPUT_BYTES,
      });
    } catch {
      return null;
    } finally {
      this.running -= 1;
    }
  }
}
