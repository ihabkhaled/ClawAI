import { Injectable } from '@nestjs/common';

import {
  RECORDED_VIDEO_MAX_SECONDS_CEILING,
  YTDLP_RECORDED_AUDIO_FORMAT,
  YTDLP_RECORDED_DOWNLOAD_ARGS,
  YTDLP_RECORDED_DOWNLOAD_TIMEOUT_MS,
  YTDLP_RECORDED_OUTPUT_TEMPLATE,
  YTDLP_RECORDED_PROBE_ARGS,
  YTDLP_RECORDED_VISION_FORMAT,
} from '../constants/recorded-video.constants';
import { YTDLP_TIMEOUT_MS } from '../constants/server-pull.constants';
import type { RecordedProbe } from '../types/server-pull.types';
import { parseRecordedProbeLine, recordedFilePath } from '../utilities/recorded-video.utility';
import { YtdlpRunnerService } from './ytdlp-runner.service';

/**
 * Recorded videos (ADR-221 batch 6): asks yt-dlp whether a link is a recorded video and how long
 * it is, then (worker side) downloads it into the run's temp dir. Same rules as server pull: argv
 * only, no shell, the canonical watch URL we built (never the raw paste), no generic extractor,
 * bounded in time, output, size and concurrency.
 */
@Injectable()
export class RecordedVideoService {
  constructor(private readonly ytdlp: YtdlpRunnerService) {}

  /** The video's length, id and frame shape when yt-dlp reads it as a recorded (not live) video. */
  async probe(watchUrl: string): Promise<RecordedProbe | null> {
    const result = await this.ytdlp.run({
      args: YTDLP_RECORDED_PROBE_ARGS,
      watchUrl,
      timeoutMs: YTDLP_TIMEOUT_MS,
      accept: (run) =>
        run.exitCode === 0 && parseRecordedProbeLine(run.stdout.toString('utf8')) !== null,
    });
    return result === null ? null : parseRecordedProbeLine(result.stdout.toString('utf8'));
  }

  /** Downloads the video (vision modes) or its audio into `directory`; the local file, or null. */
  async download(watchUrl: string, directory: string, withVideo: boolean): Promise<string | null> {
    const result = await this.ytdlp.run({
      args: [
        ...YTDLP_RECORDED_DOWNLOAD_ARGS,
        '--match-filters',
        `!is_live & duration<=?${String(RECORDED_VIDEO_MAX_SECONDS_CEILING)}`,
        '--format',
        withVideo ? YTDLP_RECORDED_VISION_FORMAT : YTDLP_RECORDED_AUDIO_FORMAT,
        '--paths',
        directory,
        '--output',
        YTDLP_RECORDED_OUTPUT_TEMPLATE,
      ],
      watchUrl,
      timeoutMs: YTDLP_RECORDED_DOWNLOAD_TIMEOUT_MS,
      accept: (run) =>
        run.exitCode === 0 && recordedFilePath(run.stdout.toString('utf8'), directory) !== null,
    });
    return result === null ? null : recordedFilePath(result.stdout.toString('utf8'), directory);
  }
}
